import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInSeconds } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

// Types based on DTO
interface Category {
    id: number;
    name: string;
}

interface Game {
    id: number;
    name: string;
    link: string;
}

interface Challenge {
    id: number;
    title: string;
    description: string;
    points: number;
    type: 'TEMPORARY' | 'PERMANENT' | 'RACE';
    reward: 'REDBULL' | 'PIZZA' | 'SNACK';
    releaseTime: string;
    endTime: string;
    game: Game;
    categories: Category[];
    isCompleted: boolean;
    completedAt?: string;
}

interface EventInfo {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    duration: number;
}

interface EventDetails {
    id: number;
    eventInfo: EventInfo;
    challenges: Challenge[];
}

type ChallengeFilter = 'all' | 'active' | 'upcoming' | 'completed' | 'expired';

function SpecificEvent() {
    const { id } = useParams<{ id: string }>();
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ChallengeFilter>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for countdowns
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Compute stats from challenges
    const stats = useMemo(() => {
        if (!eventDetails) {
            return {
                totalChallenges: 0,
                completedChallenges: 0,
                totalPoints: 0,
                earnedPoints: 0,
                activeChallenges: 0,
                upcomingChallenges: 0,
                expiredChallenges: 0,
            };
        }

        let totalChallenges = eventDetails.challenges.length;
        let completedChallenges = 0;
        let totalPoints = 0;
        let earnedPoints = 0;
        let activeChallenges = 0;
        let upcomingChallenges = 0;
        let expiredChallenges = 0;

        const now = currentTime;

        eventDetails.challenges.forEach((challenge) => {
            totalPoints += challenge.points;

            const releaseTime = new Date(challenge.releaseTime);
            const endTime = new Date(challenge.endTime);

            if (challenge.isCompleted) {
                completedChallenges++;
                earnedPoints += challenge.points;
            } else if (now < releaseTime) {
                upcomingChallenges++;
            } else if (now > endTime && challenge.type !== 'PERMANENT') {
                expiredChallenges++;
            } else {
                activeChallenges++;
            }
        });

        return {
            totalChallenges,
            completedChallenges,
            totalPoints,
            earnedPoints,
            activeChallenges,
            upcomingChallenges,
            expiredChallenges,
        };
    }, [eventDetails, currentTime]);

    // Fetch event details
    const fetchEventDetails = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/events/${id}`);
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            const data: EventDetails = await response.json();
            setEventDetails(data);

            // Cache the data
            localStorage.setItem(`event-${id}-details`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    // Load cached data or fetch new data
    useEffect(() => {
        if (!id) return;

        const cached = localStorage.getItem(`event-${id}-details`);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 300000) { // 5 minutes cache
                    setEventDetails(data);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                localStorage.removeItem(`event-${id}-details`);
            }
        }

        fetchEventDetails();
    }, [id, refreshKey]);

    // Auto-refresh when challenges expire or become active
    useEffect(() => {
        if (!eventDetails) return;

        const now = new Date();
        let nextUpdate = Infinity;

        eventDetails.challenges.forEach(challenge => {
            const releaseTime = new Date(challenge.releaseTime).getTime();
            const endTime = new Date(challenge.endTime).getTime();
            const currentTime = now.getTime();

            if (releaseTime > currentTime) {
                nextUpdate = Math.min(nextUpdate, releaseTime - currentTime);
            } else if (endTime > currentTime) {
                nextUpdate = Math.min(nextUpdate, endTime - currentTime);
            }
        });

        if (nextUpdate < Infinity && nextUpdate > 0) {
            const timeout = setTimeout(() => {
                fetchEventDetails();
            }, nextUpdate + 1000); // Add 1 second buffer

            return () => clearTimeout(timeout);
        }
    }, [eventDetails]);

    // Get challenge status
    const getChallengeStatus = (challenge: Challenge) => {
        const now = currentTime;
        const releaseTime = new Date(challenge.releaseTime);
        const endTime = new Date(challenge.endTime);

        if (challenge.isCompleted) {
            return { status: 'completed', color: '#00ff88', bgColor: 'rgba(0, 255, 136, 0.1)', icon: '✅' };
        } else if (now < releaseTime) {
            return { status: 'upcoming', color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.1)', icon: '⏳' };
        } else if (now > endTime && challenge.type !== 'PERMANENT') {
            return { status: 'expired', color: '#ff4444', bgColor: 'rgba(255, 68, 68, 0.1)', icon: '⏰' };
        } else {
            return { status: 'active', color: '#00ff88', bgColor: 'rgba(0, 255, 136, 0.1)', icon: '🔥' };
        }
    };

    // Format countdown
    const getCountdown = (challenge: Challenge) => {
        const now = currentTime;
        const releaseTime = new Date(challenge.releaseTime);
        const endTime = new Date(challenge.endTime);

        if (challenge.isCompleted) {
            return { text: 'Complété', color: '#00ff88' };
        }

        if (now < releaseTime) {
            const diff = differenceInSeconds(releaseTime, now);
            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            if (days > 0) {
                return { text: `Démarre dans ${days}j ${hours}h`, color: '#ffd700' };
            } else if (hours > 0) {
                return { text: `Démarre dans ${hours}h ${minutes}m`, color: '#ffd700' };
            } else if (minutes > 0) {
                return { text: `Démarre dans ${minutes}m ${seconds}s`, color: '#ffd700' };
            } else {
                return { text: `Démarre dans ${seconds}s`, color: '#ffd700' };
            }
        }

        if (challenge.type === 'PERMANENT') {
            return { text: 'Permanent', color: '#00ff88' };
        }

        if (now > endTime) {
            return { text: 'Expiré', color: '#ff4444' };
        }

        const diff = differenceInSeconds(endTime, now);
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (diff <= 0) {
            return { text: 'Expiré', color: '#ff4444' };
        } else if (days > 0) {
            return { text: `${days}j ${hours}h restantes`, color: '#00ff88' };
        } else if (hours > 0) {
            return { text: `${hours}h ${minutes}m restantes`, color: hours < 1 ? '#ff8800' : '#00ff88' };
        } else if (minutes > 0) {
            return { text: `${minutes}m ${seconds}s restantes`, color: minutes < 10 ? '#ff4444' : '#ff8800' };
        } else {
            return { text: `${seconds}s restantes`, color: '#ff4444' };
        }
    };

    // Get reward info
    const getRewardInfo = (reward: string) => {
        switch (reward) {
            case 'REDBULL':
                return { icon: '🥤', name: 'Red Bull' };
            case 'PIZZA':
                return { icon: '🍕', name: 'Pizza' };
            case 'SNACK':
                return { icon: '🍿', name: 'Snack' };
            default:
                return { icon: '🎁', name: 'Récompense' };
        }
    };

    // Get type info
    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'RACE':
                return { icon: '🏁', name: 'Course', color: '#ff4444' };
            case 'TEMPORARY':
                return { icon: '⏱️', name: 'Temporaire', color: '#ff8800' };
            case 'PERMANENT':
                return { icon: '♾️', name: 'Permanent', color: '#00ff88' };
            default:
                return { icon: '🎯', name: 'Défi', color: '#ffd700' };
        }
    };

    // Filter challenges
    const getFilteredChallenges = () => {
        if (!eventDetails) return [];

        let filtered = eventDetails.challenges;

        if (filter !== 'all') {
            filtered = filtered.filter(challenge => {
                const status = getChallengeStatus(challenge).status;
                return status === filter;
            });
        }

        if (searchTerm.trim()) {
            filtered = filtered.filter(challenge =>
                challenge.game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                challenge.categories.some(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return filtered.sort((a, b) => {
            // Sort by status priority, then by release time
            const statusA = getChallengeStatus(a).status;
            const statusB = getChallengeStatus(b).status;

            const priority = { active: 0, upcoming: 1, completed: 2, expired: 3 };
            const priorityA = priority[statusA as keyof typeof priority] ?? 4;
            const priorityB = priority[statusB as keyof typeof priority] ?? 4;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            return new Date(a.releaseTime).getTime() - new Date(b.releaseTime).getTime();
        });
    };

    // Get filter counts
    const getFilterCounts = () => {
        if (!eventDetails) return { all: 0, active: 0, upcoming: 0, completed: 0, expired: 0 };

        const counts = { all: 0, active: 0, upcoming: 0, completed: 0, expired: 0 };

        eventDetails.challenges.forEach(challenge => {
            counts.all++;
            const status = getChallengeStatus(challenge).status;
            counts[status as keyof typeof counts]++;
        });

        return counts;
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #333',
                    borderTop: '4px solid #ffd700',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ fontSize: '1.2rem', color: '#ccc' }}>
                    Chargement de l'événement...
                </p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    textAlign: 'center',
                    padding: '3rem',
                    border: '2px solid #ff4444',
                    borderRadius: '12px',
                    backgroundColor: '#2a2a2a',
                    margin: '2rem 0'
                }}
            >
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😵</div>
                <p style={{ color: '#ff4444', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                    {error}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => {
                            setError(null);
                            setRefreshKey(prev => prev + 1);
                        }}
                        style={{
                            padding: '0.8rem 2rem',
                            backgroundColor: '#ffd700',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Réessayer
                    </button>
                    <Link
                        to="/events"
                        style={{
                            padding: '0.8rem 2rem',
                            backgroundColor: 'transparent',
                            color: '#ffd700',
                            border: '2px solid #ffd700',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        ← Retour aux événements
                    </Link>
                </div>
            </motion.div>
        );
    }

    if (!eventDetails) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>
                <p>Événement non trouvé</p>
                <Link to="/events" style={{ color: '#ffd700', textDecoration: 'none' }}>
                    ← Retour aux événements
                </Link>
            </div>
        );
    }

    const filteredChallenges = getFilteredChallenges();
    const filterCounts = getFilterCounts();
    const progressPercentage = stats.totalChallenges > 0
        ? Math.round((stats.completedChallenges / stats.totalChallenges) * 100)
        : 0;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '2rem', marginBottom: '2rem' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Link
                        to="/events"
                        style={{
                            color: '#ffd700',
                            textDecoration: 'none',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        ← Retour
                    </Link>
                    <h1 style={{ color: '#ffd700', margin: 0, fontSize: '2.5rem' }}>
                        🎮 {eventDetails.eventInfo.name}
                    </h1>
                </div>

                <p style={{ color: '#ccc', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                    {eventDetails.eventInfo.description}
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                        border: '2px solid #ffd700',
                        borderRadius: '12px',
                        padding: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                        <div style={{ color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {stats.earnedPoints}/{stats.totalPoints}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Points</div>
                        <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#333',
                            borderRadius: '3px',
                            marginTop: '0.5rem',
                            overflow: 'hidden'
                        }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(stats.earnedPoints / stats.totalPoints) * 100}%` }}
                                transition={{ duration: 1 }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
                                    borderRadius: '3px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                        border: '2px solid #00ff88',
                        borderRadius: '12px',
                        padding: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                        <div style={{ color: '#00ff88', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {stats.completedChallenges}/{stats.totalChallenges}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Défis complétés</div>
                        <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#333',
                            borderRadius: '3px',
                            marginTop: '0.5rem',
                            overflow: 'hidden'
                        }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1 }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #00ff88, #00cc6a)',
                                    borderRadius: '3px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                        border: '2px solid #ff8800',
                        borderRadius: '12px',
                        padding: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                        <div style={{ color: '#ff8800', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {stats.activeChallenges}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Défis actifs</div>
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}
            >
                <input
                    type="text"
                    placeholder="🔍 Rechercher par jeu ou catégorie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: '2px solid #ffd700',
                        borderRadius: '8px',
                        backgroundColor: '#1a1a1a',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none'
                    }}
                />

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: 'Tous', icon: '📋' },
                            { key: 'active', label: 'Actifs', icon: '🔥' },
                            { key: 'upcoming', label: 'À venir', icon: '⏳' },
                            { key: 'completed', label: 'Complétés', icon: '✅' },
                            { key: 'expired', label: 'Expirés', icon: '⏰' }
                        ].map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key as ChallengeFilter)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    border: `2px solid ${filter === key ? '#ffd700' : '#555'}`,
                                    borderRadius: '20px',
                                    backgroundColor: filter === key ? '#ffd700' : '#2a2a2a',
                                    color: filter === key ? '#000' : '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: filter === key ? 'bold' : 'normal'
                                }}
                            >
                                {icon} {label} ({filterCounts[key as keyof typeof filterCounts]})
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            localStorage.removeItem(`event-${id}-details`);
                            setRefreshKey(prev => prev + 1);
                        }}
                        style={{
                            padding: '0.6rem 1rem',
                            backgroundColor: '#ffd700',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Rafraîchir
                    </button>
                </div>
            </motion.div>

            {/* Challenges Grid */}
            {filteredChallenges.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: '#888',
                        fontSize: '1.1rem'
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ color: '#ccc', marginBottom: '0.5rem' }}>Aucun défi trouvé</h3>
                    <p>Essayez de modifier vos critères de recherche.</p>
                </motion.div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={filter + searchTerm}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'grid',
                            gap: '1.5rem',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            marginBottom: '2rem'
                        }}
                    >
                        {filteredChallenges.map((challenge, index) => {
                            const status = getChallengeStatus(challenge);
                            const countdown = getCountdown(challenge);
                            const reward = getRewardInfo(challenge.reward);
                            const typeInfo = getTypeInfo(challenge.type);

                            return (
                                <motion.div
                                    key={challenge.id}
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.4, delay: index * 0.05 }}
                                    whileHover={{
                                        y: -5,
                                        boxShadow: `0 10px 30px ${status.color}20`,
                                        transition: { duration: 0.2 }
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                                        border: `2px solid ${status.color}`,
                                        borderRadius: '16px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Status Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        backgroundColor: status.bgColor,
                                        border: `1px solid ${status.color}`,
                                        color: status.color,
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        zIndex: 2
                                    }}>
                                        {status.icon}
                                    </div>

                                    {/* Type Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        left: '0.5rem',
                                        backgroundColor: `${typeInfo.color}20`,
                                        border: `1px solid ${typeInfo.color}`,
                                        color: typeInfo.color,
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        zIndex: 2
                                    }}>
                                        {typeInfo.icon} {typeInfo.name}
                                    </div>

                                    <div style={{ padding: '2rem 1.5rem 1.5rem' }}>
                                        {/* Game Info */}
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                color: '#000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '1rem',
                                                borderRadius: '12px',
                                                fontSize: '1.5rem'
                                            }}>
                                                🎮
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                                                    {challenge.game.name}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                                    <span style={{ color: '#ffd700', fontSize: '1rem', fontWeight: 'bold' }}>
                                                        🏆 {challenge.points} pts
                                                    </span>
                                                    <span style={{ color: reward.icon === '🥤' ? '#ff4444' : reward.icon === '🍕' ? '#ff8800' : '#ffd700', fontSize: '0.9rem' }}>
                                                        {reward.icon} {reward.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Categories */}
                                        {challenge.categories.length > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {challenge.categories.map(category => (
                                                        <span
                                                            key={category.id}
                                                            style={{
                                                                backgroundColor: '#333',
                                                                color: '#ccc',
                                                                padding: '0.2rem 0.6rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.8rem',
                                                                border: '1px solid #555'
                                                            }}
                                                        >
                                                            #{category.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Countdown */}
                                        <div style={{
                                            background: `${countdown.color}20`,
                                            border: `2px solid ${countdown.color}`,
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            textAlign: 'center',
                                            marginBottom: '1rem'
                                        }}>
                                            <div style={{
                                                color: countdown.color,
                                                fontSize: '1.3rem',
                                                fontWeight: 'bold',
                                                fontFamily: 'monospace'
                                            }}>
                                                {countdown.text}
                                            </div>
                                            {challenge.type !== 'PERMANENT' && !challenge.isCompleted && (
                                                <div style={{
                                                    color: '#ccc',
                                                    fontSize: '0.8rem',
                                                    marginTop: '0.5rem'
                                                }}>
                                                    {new Date(challenge.releaseTime) > currentTime
                                                        ? `Début: ${format(new Date(challenge.releaseTime), 'dd/MM à HH:mm', { locale: fr })}`
                                                        : `Fin: ${format(new Date(challenge.endTime), 'dd/MM à HH:mm', { locale: fr })}`
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        {/* Completion Info */}
                                        {challenge.isCompleted && challenge.completedAt && (
                                            <div style={{
                                                background: 'rgba(0, 255, 136, 0.1)',
                                                border: '1px solid #00ff88',
                                                borderRadius: '8px',
                                                padding: '0.8rem',
                                                textAlign: 'center',
                                                marginBottom: '1rem'
                                            }}>
                                                <div style={{ color: '#00ff88', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    ✨ Complété le {format(new Date(challenge.completedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <div style={{ textAlign: 'center' }}>
                                            {challenge.isCompleted ? (
                                                <button
                                                    disabled
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.8rem',
                                                        backgroundColor: '#00ff88',
                                                        color: '#000',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'not-allowed',
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    ✅ Défi complété
                                                </button>
                                            ) : status.status === 'expired' ? (
                                                <button
                                                    disabled
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.8rem',
                                                        backgroundColor: '#ff4444',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'not-allowed',
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    ⏰ Défi expiré
                                                </button>
                                            ) : status.status === 'upcoming' ? (
                                                <button
                                                    disabled
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.8rem',
                                                        backgroundColor: '#ffd700',
                                                        color: '#000',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'not-allowed',
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    ⏳ Bientôt disponible
                                                </button>
                                            ) : (
                                                <a
                                                    href={challenge.game.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        padding: '0.8rem',
                                                        backgroundColor: '#ffd700',
                                                        color: '#000',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold',
                                                        textDecoration: 'none',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#ffed4e';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#ffd700';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    🚀 Jouer maintenant
                                                </a>
                                            )}
                                        </div>

                                        {/* Progress Indicator for Race type */}
                                        {challenge.type === 'RACE' && status.status === 'active' && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.8rem',
                                                background: 'rgba(255, 68, 68, 0.1)',
                                                border: '1px solid #ff4444',
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ color: '#ff4444', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    🏁 Premier arrivé, premier servi !
                                                </div>
                                                <div style={{ color: '#ccc', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                                                    Dépêchez-vous avant que quelqu'un d'autre ne termine
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Event Timeline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                    background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                    border: '2px solid #ffd700',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginTop: '3rem',
                    marginBottom: '2rem'
                }}
            >
                <h2 style={{ color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>
                    📅 Timeline de l'événement
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                    <div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Début</div>
                        <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {format(new Date(eventDetails.eventInfo.startDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Fin</div>
                        <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {format(new Date(eventDetails.eventInfo.endDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Durée totale</div>
                    <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {eventDetails.eventInfo.duration} heure{eventDetails.eventInfo.duration > 1 ? 's' : ''}
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '3rem'
                }}
            >
                <div style={{
                    background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                    border: '2px solid #ff8800',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                    <div style={{ color: '#ff8800', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {stats.upcomingChallenges}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>À venir</div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                    border: '2px solid #ff4444',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏰</div>
                    <div style={{ color: '#ff4444', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {stats.expiredChallenges}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Expirés</div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                    border: '2px solid #8844ff',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</div>
                    <div style={{ color: '#8844ff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {Math.round(progressPercentage)}%
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Progression</div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                    border: '2px solid #00ffcc',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
                    <div style={{ color: '#00ffcc', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {stats.earnedPoints > 0 ? Math.round(stats.earnedPoints / stats.completedChallenges) || 0 : 0}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Points/défi</div>
                </div>
            </motion.div>

            {/* Back to top button */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                        padding: '0.8rem 1.5rem',
                        backgroundColor: 'transparent',
                        color: '#ffd700',
                        border: '2px solid #ffd700',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffd700';
                        e.currentTarget.style.color = '#000';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#ffd700';
                    }}
                >
                    ↑ Retour en haut
                </button>
            </div>
        </div>
    );
}

export default SpecificEvent;