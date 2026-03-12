'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Tag, MapPin, Target, Smartphone, User, DollarSign, Calendar, Monitor, BarChart3, Zap, TrendingUp, Link as LinkIcon } from 'lucide-react';

export default function CreateAdRequest() {
    const supabase = createClient();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetUrl, setTargetUrl] = useState('');

    // Multiple images state
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);

    const [locations, setLocations] = useState('');
    const [tags, setTags] = useState('');
    const [genders, setGenders] = useState('');
    const [ageRanges, setAgeRanges] = useState('');
    const [devices, setDevices] = useState('');
    const [osFamilies, setOsFamilies] = useState('');
    const [incomeLevels, setIncomeLevels] = useState('');

    // Budgets and Auction
    const [dailyBudget, setDailyBudget] = useState('');
    const [totalBudget, setTotalBudget] = useState('');
    const [maxCpc, setMaxCpc] = useState('0.50');
    const [category, setCategory] = useState('GENERAL');
    const [pacingMode, setPacingMode] = useState('STANDARD');
    
    // Quality Score inputs (for initial setup)
    const [expectedCtr, setExpectedCtr] = useState('0.02');
    const [landingPageUrl, setLandingPageUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setImageFiles(prev => [...prev, ...files]);

            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImageToCloudinary = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            throw new Error('Failed to upload image');
        }

        const data = await res.json();
        return data.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('You must be logged in to create an ad.');
            }

            if (imageFiles.length === 0 && imagePreviews.length === 0) {
                throw new Error('Please upload at least one image/video for your ad.');
            }

            // Upload all images
            const uploadedUrls = await Promise.all(
                imageFiles.map(file => uploadImageToCloudinary(file))
            );

            const image_urls = [...imagePreviews.filter(p => p.startsWith('http')), ...uploadedUrls];
            const primary_image_url = image_urls[0] || '';

            // Split lists
            const parseList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

            const targetLocations = parseList(locations);
            const targetTags = parseList(tags).map(t => t.toLowerCase());
            const targetGenders = parseList(genders);
            const targetAgeRanges = parseList(ageRanges);
            const targetDevices = parseList(devices);
            const targetOs = parseList(osFamilies);
            const targetIncomeLevels = parseList(incomeLevels);

            const { error: dbError } = await supabase
                .from('ads')
                .insert({
                    user_id: session.user.id,
                    title,
                    description,
                    target_url: targetUrl,
                    image_url: primary_image_url,
                    image_urls: image_urls,
                    target_locations: targetLocations,
                    target_tags: targetTags,
                    target_genders: targetGenders,
                    target_age_ranges: targetAgeRanges,
                    target_devices: targetDevices,
                    target_os: targetOs,
                    target_income_levels: targetIncomeLevels,
                    daily_budget: Number(dailyBudget) || 0,
                    total_budget: Number(totalBudget) || 0,
                    max_cpc: Number(maxCpc) || 0.5,
                    category,
                    pacing_mode: pacingMode,
                    expected_ctr: Number(expectedCtr) || 0.02,
                    landing_page_url: landingPageUrl,
                    is_starter_boost: true, // Enable starter boost for new ads
                    status: 'PENDING'
                });

            if (dbError) throw dbError;

            router.push('/ads');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred while submitting your request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-ui)' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
                Request Sponsored Ad (Advanced Targeting)
            </h1>
            <p style={{ color: 'var(--color-muted)', marginBottom: '32px' }}>
                Create a high-performing sponsored ad with multiple slideshow assets and detailed targeting capability.
            </p>

            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface)', padding: '32px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Media Upload (Multiple) */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Ad Assets (Upload multiple for slideshow) *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        {imagePreviews.map((preview, index) => {
                            const isVideo = preview.includes('data:video') || preview.match(/\.(mp4|webm|mov|ogg)$/i) || preview.includes('/video/upload/');
                            return (
                                <div key={index} style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid var(--color-border)' }}>
                                    {isVideo ? (
                                        <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted autoPlay loop playsInline />
                                    ) : (
                                        <img src={preview} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                    <button type="button" onClick={() => removeImage(index)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                </div>
                            );
                        })}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '120px', height: '120px', borderRadius: '8px', border: '2px dashed var(--color-border)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', background: 'var(--color-bg)', overflow: 'hidden'
                            }}
                        >
                            <ImageIcon size={24} color="var(--color-muted)" style={{ marginBottom: '8px' }} />
                            <span style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '11px' }}>Add Asset</span>
                        </div>
                        <input type="file" accept="image/*,video/*" multiple ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Ad Title *</label>
                        <input className="input" type="text" required placeholder="Get 50% off premium tools" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Target URL *</label>
                        <input className="input" type="url" required placeholder="https://yourbusiness.com" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Short Description</label>
                    <textarea className="input" rows={2} placeholder="Tell users why they should click..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '32px 0' }} />

                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} /> Audience Targeting
                </h3>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><MapPin size={14} /> Locations</label>
                        <input className="input input-sm" type="text" placeholder="US, UK, Global" value={locations} onChange={e => setLocations(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><Tag size={14} /> Tags & Interests</label>
                        <input className="input input-sm" type="text" placeholder="tech, writing, design" value={tags} onChange={e => setTags(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><User size={14} /> Genders</label>
                        <input className="input input-sm" type="text" placeholder="Male, Female, All" value={genders} onChange={e => setGenders(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><Calendar size={14} /> Age Ranges</label>
                        <input className="input input-sm" type="text" placeholder="18-24, 25-34" value={ageRanges} onChange={e => setAgeRanges(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><Smartphone size={14} /> Device Types</label>
                        <input className="input input-sm" type="text" placeholder="Mobile, Desktop, Tablet" value={devices} onChange={e => setDevices(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><Monitor size={14} /> Operating Systems</label>
                        <input className="input input-sm" type="text" placeholder="iOS, Android, Windows" value={osFamilies} onChange={e => setOsFamilies(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}><DollarSign size={14} /> Income Levels</label>
                        <input className="input input-sm" type="text" placeholder="Low, Medium, High" value={incomeLevels} onChange={e => setIncomeLevels(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>Daily Budget ($)</label>
                        <input className="input input-sm" type="number" placeholder="50" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} min="1" step="any" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>Total Budget ($)</label>
                        <input className="input input-sm" type="number" placeholder="1500" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} min="1" step="any" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>Max CPC ($)</label>
                        <input className="input input-sm" type="number" placeholder="0.50" value={maxCpc} onChange={e => setMaxCpc(e.target.value)} min="0.01" step="0.01" />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '32px 0' }} />

                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} /> Auction Settings (Quality Score Optimizer)
                </h3>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>
                            <Briefcase size={14} /> Category
                        </label>
                        <select 
                            className="input input-sm" 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px' }}
                        >
                            <option value="GENERAL">General Lifestyle ($0.10 min CPC)</option>
                            <option value="FASHION_BEAUTY">Fashion & Beauty ($0.15 min CPC)</option>
                            <option value="FINANCE_INSURANCE">Finance & Insurance ($0.50 min CPC)</option>
                            <option value="TECH">Technology</option>
                            <option value="FOOD">Food & Dining</option>
                            <option value="TRAVEL">Travel & Tourism</option>
                            <option value="HOME">Home & Garden</option>
                            <option value="SPORTS">Sports & Fitness</option>
                            <option value="ENTERTAINMENT">Entertainment</option>
                        </select>
                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                            Higher competition categories have higher minimum CPC floors
                        </p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>
                            <Zap size={14} /> Budget Pacing
                        </label>
                        <select 
                            className="input input-sm" 
                            value={pacingMode} 
                            onChange={e => setPacingMode(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px' }}
                        >
                            <option value="STANDARD">Standard (Spread evenly across 24h)</option>
                            <option value="ACCELERATED">Accelerated (Spend as fast as possible)</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>
                            <TrendingUp size={14} /> Expected CTR
                        </label>
                        <input 
                            className="input input-sm" 
                            type="number" 
                            placeholder="0.02" 
                            value={expectedCtr} 
                            onChange={e => setExpectedCtr(e.target.value)} 
                            min="0.001" 
                            max="0.5" 
                            step="0.001"
                        />
                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                            Est. click-through rate (2% = 0.02). Affects Quality Score (40% weight)
                        </p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>
                            <LinkIcon size={14} /> Landing Page URL
                        </label>
                        <input 
                            className="input input-sm" 
                            type="url" 
                            placeholder="https://..." 
                            value={landingPageUrl} 
                            onChange={e => setLandingPageUrl(e.target.value)}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                            Used for landing page quality scoring (15% of QS)
                        </p>
                    </div>
                </div>

                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px', marginBottom: '32px' }}>
                    <p style={{ fontSize: '13px', color: '#166534', fontWeight: 600, marginBottom: '8px' }}>
                        🚀 Starter Boost Enabled
                    </p>
                    <p style={{ fontSize: '12px', color: '#15803D' }}>
                        New ads receive a temporary Quality Score of 5.0 for the first 500 impressions to gather real performance data. 
                        After 500 impressions, your actual QS (based on 40% CTR + 30% Relevance + 15% Landing Page + 15% Engagement) will determine ad rank.
                    </p>
                </div>

                <div style={{ marginBottom: '32px', fontSize: '12px', color: 'var(--color-muted)' }}>
                    * Targeting fields are optional. Separate multiple values with commas. Leaving targeting blank targets the whole network.
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }} disabled={loading}>
                    {loading ? 'Submitting Request...' : 'Submit Ad Request'}
                </button>
            </form>
        </div>
    );
}
