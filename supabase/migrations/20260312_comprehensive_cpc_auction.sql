-- Comprehensive CPC Auction System Schema Migration
-- Apply this to Supabase to enable full auction + quality score system

-- 1. Add Quality Score components to ads table
ALTER TABLE public.ads 
    ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 5.0 CHECK (quality_score >= 1 AND quality_score <= 10),
    ADD COLUMN IF NOT EXISTS expected_ctr NUMERIC DEFAULT 0.02 CHECK (expected_ctr >= 0 AND expected_ctr <= 1),
    ADD COLUMN IF NOT EXISTS relevance_score NUMERIC DEFAULT 5.0 CHECK (relevance_score >= 1 AND relevance_score <= 10),
    ADD COLUMN IF NOT EXISTS landing_page_score NUMERIC DEFAULT 5.0 CHECK (landing_page_score >= 1 AND landing_page_score <= 10),
    ADD COLUMN IF NOT EXISTS engagement_score NUMERIC DEFAULT 5.0 CHECK (engagement_score >= 1 AND engagement_score <= 10),
    ADD COLUMN IF NOT EXISTS ad_rank NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_cpc_charged NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bid_multiplier NUMERIC DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS pacing_mode TEXT DEFAULT 'STANDARD' CHECK (pacing_mode IN ('STANDARD', 'ACCELERATED')),
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'FASHION_BEAUTY', 'FINANCE_INSURANCE', 'TECH', 'FOOD', 'TRAVEL', 'HOME', 'SPORTS', 'ENTERTAINMENT')),
    ADD COLUMN IF NOT EXISTS total_spend NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_impressions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_starter_boost BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auction_reset_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS diversity_slot_eligible BOOLEAN DEFAULT FALSE;

-- 2. Create auction results table to track auction history
CREATE TABLE IF NOT EXISTS public.ad_auction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    auction_timestamp TIMESTAMPTZ DEFAULT NOW(),
    bid_amount NUMERIC NOT NULL,
    quality_score NUMERIC NOT NULL,
    ad_rank NUMERIC NOT NULL,
    position_achieved INTEGER,
    next_competitor_bid NUMERIC,
    next_competitor_qs NUMERIC,
    actual_cpc_charged NUMERIC,
    won_auction BOOLEAN DEFAULT FALSE,
    targeting_match_score NUMERIC DEFAULT 1.0,
    effective_bid NUMERIC DEFAULT 0,
    targeting_type TEXT DEFAULT 'BROAD'
);

CREATE INDEX IF NOT EXISTS idx_auction_timestamp ON public.ad_auction_results(auction_timestamp);
CREATE INDEX IF NOT EXISTS idx_auction_ad_id_timestamp ON public.ad_auction_results(ad_id, auction_timestamp);

-- 3. Create feed injection slots table for position tracking
CREATE TABLE IF NOT EXISTS public.feed_ad_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_session_id TEXT NOT NULL,
    slot_position INTEGER NOT NULL,
    ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
    organic_pins_before INTEGER DEFAULT 0,
    served_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_feed_session ON public.feed_ad_slots(feed_session_id, slot_position);

-- 4. Create advertiser daily stats for QS calculation
CREATE TABLE IF NOT EXISTS public.advertiser_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    landing_page_visits INTEGER DEFAULT 0,
    landing_page_bounces INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    calculated_ctr NUMERIC DEFAULT 0,
    calculated_engagement_rate NUMERIC DEFAULT 0,
    calculated_landing_quality NUMERIC DEFAULT 0,
    UNIQUE(ad_id, date)
);

-- 5. Create targeting effectiveness log
CREATE TABLE IF NOT EXISTS public.ad_targeting_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    match_type TEXT NOT NULL CHECK (match_type IN ('INTEREST', 'KEYWORD', 'REMARKETING', 'LOOKALIKE', 'BROAD')),
    match_score NUMERIC DEFAULT 1.0,
    bid_multiplier_applied NUMERIC DEFAULT 1.0,
    matched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_targeting_matches ON public.ad_targeting_matches(ad_id, user_id, match_type);

-- 6. Create function to calculate Quality Score (40% CTR, 30% Relevance, 15% Landing, 15% Engagement)
CREATE OR REPLACE FUNCTION public.calculate_quality_score(p_ad_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_expected_ctr NUMERIC;
    v_relevance NUMERIC;
    v_landing NUMERIC;
    v_engagement NUMERIC;
    v_final_qs NUMERIC;
    v_starter_boost BOOLEAN;
    v_impressions INTEGER;
    v_ctr_component NUMERIC;
    v_relevance_component NUMERIC;
    v_landing_component NUMERIC;
    v_engagement_component NUMERIC;
BEGIN
    -- Get ad data
    SELECT 
        COALESCE(expected_ctr, 0.02), 
        COALESCE(relevance_score, 5.0), 
        COALESCE(landing_page_score, 5.0), 
        COALESCE(engagement_score, 5.0),
        COALESCE(is_starter_boost, FALSE),
        COALESCE(total_impressions, 0)
    INTO v_expected_ctr, v_relevance, v_landing, v_engagement, v_starter_boost, v_impressions
    FROM public.ads WHERE id = p_ad_id;
    
    -- Starter Boost: New advertisers get QS=5 for first 500 impressions
    IF v_starter_boost AND v_impressions < 500 THEN
        v_final_qs := 5.0;
    ELSE
        -- Calculate weighted components:
        -- Expected CTR (40%): 2% baseline = 4.0 points max
        v_ctr_component := LEAST(v_expected_ctr * 200, 4.0);
        
        -- Relevance (30%): 1-10 scale = 0.3-3.0 points
        v_relevance_component := (v_relevance / 10.0) * 3.0;
        
        -- Landing Page (15%): 1-10 scale = 0.15-1.5 points  
        v_landing_component := (v_landing / 10.0) * 1.5;
        
        -- Engagement (15%): 1-10 scale = 0.15-1.5 points
        v_engagement_component := (v_engagement / 10.0) * 1.5;
        
        -- Sum components
        v_final_qs := v_ctr_component + v_relevance_component + v_landing_component + v_engagement_component;
        
        -- Minimum QS of 3 required to show at all
        v_final_qs := GREATEST(3.0, LEAST(10.0, v_final_qs));
    END IF;
    
    -- Update ad with new QS
    UPDATE public.ads 
    SET quality_score = v_final_qs,
        updated_at = NOW()
    WHERE id = p_ad_id;
    
    RETURN v_final_qs;
END;
$$;

-- 7. Create function to calculate effective bid with targeting multipliers
CREATE OR REPLACE FUNCTION public.calculate_effective_bid(
    p_ad_id UUID,
    p_user_id UUID,
    p_base_bid NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_multiplier NUMERIC := 1.0;
    v_match_type TEXT := 'BROAD';
    v_match_score NUMERIC := 0.7;
    v_user_interests TEXT[];
    v_ad_tags TEXT[];
    v_ad_keywords TEXT[];
    v_is_remarketing BOOLEAN := FALSE;
    v_is_lookalike BOOLEAN := FALSE;
BEGIN
    -- Get user interests
    SELECT array_agg(i.name) INTO v_user_interests
    FROM public.user_interests ui
    JOIN public.interests i ON ui.interest_id = i.id
    WHERE ui.user_id = p_user_id;
    
    -- Get ad targeting data
    SELECT target_tags, target_interests INTO v_ad_tags, v_ad_keywords
    FROM public.ads WHERE id = p_ad_id;
    
    -- Check for interest match (base ×1.0)
    IF v_user_interests && v_ad_tags THEN
        v_match_type := 'INTEREST';
        v_match_score := 1.0;
        v_multiplier := 1.0;
    END IF;
    
    -- Check for keyword match (×1.2) - would need search history table
    -- Check for remarketing (×1.5) - would need visitor tracking
    -- Check for lookalike (×1.3) - would need similar audience analysis
    -- Default broad (×0.7)
    
    -- Log the targeting match
    INSERT INTO public.ad_targeting_matches (ad_id, user_id, match_type, match_score, bid_multiplier_applied)
    VALUES (p_ad_id, p_user_id, v_match_type, v_match_score, v_multiplier);
    
    RETURN ROUND((p_base_bid * v_multiplier)::numeric, 2);
END;
$$;

-- 8. Create function to run ad auction
CREATE OR REPLACE FUNCTION public.run_ad_auction(
    p_user_id UUID,
    p_available_slots INTEGER DEFAULT 4,
    p_feed_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    ad_id UUID,
    ad_rank NUMERIC,
    position INTEGER,
    actual_cpc NUMERIC,
    quality_score NUMERIC,
    effective_bid NUMERIC,
    max_cpc NUMERIC,
    next_competitor_rank NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ad RECORD;
    v_competitor_rank NUMERIC;
    v_ad_rank NUMERIC;
    v_actual_cpc NUMERIC;
    v_position INTEGER := 1;
    v_slot_positions INTEGER[] := ARRAY[1, 5, 10, 15]; -- 1 ad per 4 organic pins
    v_diversity_slot INTEGER := 3; -- Position 10 = diversity slot (highest QS regardless of bid)
BEGIN
    -- First pass: Calculate ad ranks for all eligible ads
    CREATE TEMP TABLE temp_auction_results ON COMMIT DROP AS
    SELECT 
        a.id as aid,
        a.max_cpc,
        COALESCE(a.quality_score, 5.0) as qs,
        a.total_spend,
        a.total_budget,
        a.daily_budget,
        COALESCE(a.total_impressions, 0) as impressions,
        COALESCE(
            (SELECT spend FROM public.ad_daily_analytics WHERE ad_id = a.id AND date = CURRENT_DATE),
            0
        ) as daily_spend,
        public.calculate_effective_bid(a.id, p_user_id, a.max_cpc) as eff_bid,
        a.is_starter_boost,
        a.diversity_slot_eligible
    FROM public.ads a
    WHERE a.status IN ('APPROVED', 'ACTIVE')
    AND (a.total_budget = 0 OR a.total_spend < a.total_budget)
    AND (a.daily_budget = 0 OR a.daily_spend < a.daily_budget)
    AND COALESCE(a.quality_score, 5.0) >= 3.0  -- Minimum QS of 3 required
    ORDER BY (public.calculate_effective_bid(a.id, p_user_id, a.max_cpc) * COALESCE(a.quality_score, 5.0)) DESC;
    
    -- Mark diversity slot winner (highest QS in top 20, regardless of bid)
    UPDATE temp_auction_results 
    SET diversity_slot_eligible = TRUE
    WHERE aid = (
        SELECT aid FROM temp_auction_results 
        ORDER BY qs DESC 
        LIMIT 1
    );
    
    -- Second pass: Assign positions and calculate actual CPC
    FOR v_ad IN 
        SELECT * FROM temp_auction_results
        ORDER BY (eff_bid * qs) DESC
        LIMIT 20  -- Consider diversity slot candidates
    LOOP
        -- Calculate Ad Rank
        v_ad_rank := ROUND((v_ad.eff_bid * v_ad.qs)::numeric, 2);
        
        -- Find next competitor for second-price auction
        SELECT (eff_bid * qs) INTO v_competitor_rank
        FROM temp_auction_results
        WHERE (eff_bid * qs) < v_ad_rank
        ORDER BY (eff_bid * qs) DESC
        LIMIT 1;
        
        -- Calculate actual CPC (second-price auction formula)
        IF v_competitor_rank IS NOT NULL AND v_competitor_rank > 0 THEN
            v_actual_cpc := ROUND(((v_competitor_rank / v_ad.qs) + 0.01)::numeric, 2);
            v_actual_cpc := LEAST(v_actual_cpc, v_ad.eff_bid); -- Never charge more than effective bid
        ELSE
            v_actual_cpc := ROUND((v_ad.eff_bid * 0.5)::numeric, 2); -- No competition = 50% discount
        END IF;
        
        -- Apply minimum CPC by category
        v_actual_cpc := GREATEST(v_actual_cpc, 
            CASE 
                WHEN (SELECT category FROM public.ads WHERE id = v_ad.aid) = 'FINANCE_INSURANCE' THEN 0.50
                WHEN (SELECT category FROM public.ads WHERE id = v_ad.aid) = 'FASHION_BEAUTY' THEN 0.15
                ELSE 0.10  -- General minimum
            END
        );
        
        -- Return result
        ad_id := v_ad.aid;
        ad_rank := v_ad_rank;
        position := v_slot_positions[v_position];
        actual_cpc := v_actual_cpc;
        quality_score := v_ad.qs;
        effective_bid := v_ad.eff_bid;
        max_cpc := v_ad.max_cpc;
        next_competitor_rank := v_competitor_rank;
        
        RETURN NEXT;
        
        -- Move to next position
        v_position := v_position + 1;
        
        -- Stop if we've filled all slots
        EXIT WHEN v_position > p_available_slots OR v_position > array_length(v_slot_positions, 1);
    END LOOP;
    
    DROP TABLE IF EXISTS temp_auction_results;
    RETURN;
END;
$$;

-- 9. Create function to record auction win and charge
CREATE OR REPLACE FUNCTION public.record_auction_win(
    p_ad_id UUID,
    p_user_id UUID,
    p_position INTEGER,
    p_ad_rank NUMERIC,
    p_actual_cpc NUMERIC,
    p_effective_bid NUMERIC,
    p_quality_score NUMERIC,
    p_feed_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    charged_amount NUMERIC,
    new_total_spend NUMERIC,
    new_impressions INTEGER,
    ad_paused BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_charged NUMERIC;
    v_today DATE := CURRENT_DATE;
    v_daily_spend NUMERIC;
    v_new_total_spend NUMERIC;
    v_new_impressions INTEGER;
    v_is_paused BOOLEAN := FALSE;
BEGIN
    -- Get current daily spend
    SELECT COALESCE(spend, 0) INTO v_daily_spend
    FROM public.ad_daily_analytics
    WHERE ad_id = p_ad_id AND date = v_today;
    
    -- Calculate charge respecting budget caps
    SELECT LEAST(p_actual_cpc, 
        CASE 
            WHEN daily_budget > 0 THEN GREATEST(0, daily_budget - v_daily_spend)
            ELSE p_actual_cpc 
        END,
        CASE 
            WHEN total_budget > 0 THEN GREATEST(0, total_budget - total_spend)
            ELSE p_actual_cpc 
        END
    ) INTO v_charged
    FROM public.ads WHERE id = p_ad_id;
    
    -- Update ad stats
    UPDATE public.ads
    SET total_spend = total_spend + v_charged,
        total_impressions = total_impressions + 1,
        impressions_count = COALESCE(impressions_count, 0) + 1,
        actual_cpc_charged = p_actual_cpc,
        ad_rank = p_ad_rank,
        status = CASE 
            WHEN total_budget > 0 AND (total_spend + v_charged) >= total_budget THEN 'PAUSED'::text
            WHEN daily_budget > 0 AND (v_daily_spend + v_charged) >= daily_budget THEN 'PAUSED'::text
            ELSE status
        END,
        auction_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = p_ad_id
    RETURNING total_spend, total_impressions, (status = 'PAUSED') INTO v_new_total_spend, v_new_impressions, v_is_paused;
    
    -- Update daily analytics
    INSERT INTO public.ad_daily_analytics (ad_id, date, impressions_count, spend, views_count)
    VALUES (p_ad_id, v_today, 1, v_charged, 1)
    ON CONFLICT (ad_id, date)
    DO UPDATE SET 
        impressions_count = ad_daily_analytics.impressions_count + 1,
        views_count = COALESCE(ad_daily_analytics.views_count, 0) + 1,
        spend = ad_daily_analytics.spend + v_charged;
    
    -- Record auction result
    INSERT INTO public.ad_auction_results (
        ad_id, user_id, auction_timestamp, bid_amount, quality_score, 
        ad_rank, position_achieved, actual_cpc_charged, won_auction, 
        effective_bid, targeting_type
    )
    VALUES (
        p_ad_id, p_user_id, NOW(), p_effective_bid, p_quality_score,
        p_ad_rank, p_position, v_charged, TRUE,
        p_effective_bid, 'INTEREST'
    );
    
    -- Record feed slot
    IF p_feed_session_id IS NOT NULL THEN
        INSERT INTO public.feed_ad_slots (feed_session_id, slot_position, ad_id, user_id, served_at)
        VALUES (p_feed_session_id, p_position, p_ad_id, p_user_id, NOW());
    END IF;
    
    charged_amount := v_charged;
    new_total_spend := v_new_total_spend;
    new_impressions := v_new_impressions;
    ad_paused := v_is_paused;
    
    RETURN NEXT;
END;
$$;

-- 10. Create updated click tracking function with second-price auction
CREATE OR REPLACE FUNCTION public.record_ad_click_v2(
    p_ad_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_os_family TEXT DEFAULT NULL
)
RETURNS TABLE (
    ad_id UUID,
    charged_amount NUMERIC,
    clicks_count INTEGER,
    total_spend NUMERIC,
    target_url TEXT,
    actual_cpc_used NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ad public.ads%rowtype;
    v_today DATE := CURRENT_DATE;
    v_current_daily_spend NUMERIC := 0;
    v_total_spend NUMERIC := 0;
    v_charge NUMERIC := 0;
    v_clicks INTEGER := 0;
    v_actual_cpc NUMERIC;
BEGIN
    SELECT * INTO v_ad
    FROM public.ads
    WHERE id = p_ad_id
      AND status IN ('APPROVED', 'ACTIVE')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ad not available';
    END IF;

    -- Use auction-derived CPC if available, else calculate from max_cpc
    v_actual_cpc := COALESCE(v_ad.actual_cpc_charged, v_ad.max_cpc);
    
    -- Get current spends
    SELECT COALESCE(spend, 0) INTO v_current_daily_spend
    FROM public.ad_daily_analytics
    WHERE ad_id = p_ad_id AND date = v_today;

    SELECT COALESCE(spend, 0) INTO v_total_spend
    FROM public.ad_daily_analytics
    WHERE ad_id = p_ad_id;

    -- Calculate charge respecting budget caps
    v_charge := LEAST(v_actual_cpc,
        CASE WHEN v_ad.daily_budget > 0 THEN GREATEST(0, v_ad.daily_budget - v_current_daily_spend) ELSE v_actual_cpc END,
        CASE WHEN v_ad.total_budget > 0 THEN GREATEST(0, v_ad.total_budget - v_total_spend) ELSE v_actual_cpc END
    );

    -- Record interaction
    INSERT INTO public.ad_interactions (ad_id, user_id, interaction_type, created_at, os_family, device_type, location, ip_address)
    VALUES (p_ad_id, p_user_id, 'CLICK', NOW(), p_os_family, p_device_type, p_location, p_ip_address);

    -- Update ad
    UPDATE public.ads
    SET clicks_count = COALESCE(clicks_count, 0) + 1,
        total_spend = total_spend + v_charge,
        updated_at = NOW(),
        status = CASE
            WHEN total_budget > 0 AND (total_spend + v_charge) >= total_budget THEN 'PAUSED'
            WHEN daily_budget > 0 AND (v_current_daily_spend + v_charge) >= daily_budget THEN 'PAUSED'
            ELSE status
        END
    WHERE id = p_ad_id
    RETURNING clicks_count INTO v_clicks;

    -- Update daily analytics
    INSERT INTO public.ad_daily_analytics (ad_id, date, clicks_count, spend)
    VALUES (p_ad_id, v_today, 1, v_charge)
    ON CONFLICT (ad_id, date)
    DO UPDATE SET
        clicks_count = ad_daily_analytics.clicks_count + 1,
        spend = ad_daily_analytics.spend + v_charge;

    RETURN QUERY
    SELECT
        p_ad_id,
        v_charge,
        v_clicks,
        v_total_spend + v_charge,
        v_ad.target_url,
        v_actual_cpc;
END;
$$;

-- 11. Create function to batch update Quality Scores (run every 6 hours)
CREATE OR REPLACE FUNCTION public.batch_update_quality_scores()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_ad RECORD;
BEGIN
    FOR v_ad IN 
        SELECT id FROM public.ads 
        WHERE status IN ('APPROVED', 'ACTIVE')
        AND (auction_reset_at IS NULL OR auction_reset_at < NOW() - INTERVAL '6 hours')
    LOOP
        PERFORM public.calculate_quality_score(v_ad.id);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- 12. Create function to enable starter boost for new advertisers
CREATE OR REPLACE FUNCTION public.enable_starter_boost(p_ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.ads
    SET is_starter_boost = TRUE,
        quality_score = 5.0,  -- Temporary boost
        updated_at = NOW()
    WHERE id = p_ad_id
    AND total_impressions < 500;
END;
$$;

-- 13. Create indexes for auction performance
CREATE INDEX IF NOT EXISTS idx_ads_auction_ready 
    ON public.ads(status, quality_score, total_spend, total_budget) 
    WHERE status IN ('APPROVED', 'ACTIVE') AND quality_score >= 3.0;

CREATE INDEX IF NOT EXISTS idx_ads_ad_rank_calc 
    ON public.ads((max_cpc * quality_score), quality_score, status) 
    WHERE status IN ('APPROVED', 'ACTIVE');

-- 14. Add comment explaining the auction system
COMMENT ON FUNCTION public.run_ad_auction IS 
'Runs a second-price auction for feed ad placement.
Ad Rank = Effective Bid × Quality Score (1-10)
Actual CPC = (Next Competitor Ad Rank / Your QS) + $0.01
Positions: 1, 5, 10, 15 (1 ad per 4 organic pins)
Minimum QS: 3.0 to be eligible
Diversity slot (position 10): Reserved for highest QS advertiser regardless of bid';

-- 15. Migration complete - data preservation notes
-- Existing ads will have default values:
-- - quality_score: 5.0 (neutral)
-- - All scores: 5.0 (neutral)
-- - is_starter_boost: FALSE
-- - category: GENERAL
-- - pacing_mode: STANDARD
