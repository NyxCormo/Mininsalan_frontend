import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from "framer-motion";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

// Interface for event summary with challenge information
interface EventSummary {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    totalChallenges: number;
    availableChallenges: number;
    isActive: boolean;
}

// Filter types for event filtering
type EventFilter = 'all' | 'active' | 'upcoming' | 'past';

function Events() {
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<EventFilter>('upcoming');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchEventsSummary = async () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Fetching events from /api/events/summary');
        }
        try {
            const response = await fetch(`/api/events/summary?t=${Date.now()}`);
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetch response status:', response.status, response.statusText);
            }
            if (!response.ok) {
                console.error(`Échec de la récupération des événements: ${response.statusText}`);
            }
            const data: EventSummary[] = await response.json();
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetch result:', data);
            }
            setEvents(data);
            localStorage.setItem('cachedEventsSummary', JSON.stringify({ data, timestamp: Date.now() }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            if (process.env.NODE_ENV === 'development') {
                console.error('Fetch error:', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper function to determine event status
    const getEventStatus = (event: EventSummary): { text: string; color: string; bgColor: string; icon: string } => {
        const now = new Date();
        const start = new Date(event.startDate);

        if (event.isActive) {
            return {
                text: 'En cours',
                color: '#00ff88',
                bgColor: 'rgba(0, 255, 136, 0.1)',
                icon: '🔥'
            };
        } else if (start > now) {
            return {
                text: 'À venir',
                color: '#ffd700',
                bgColor: 'rgba(255, 215, 0, 0.1)',
                icon: '⏳'
            };
        } else {
            return {
                text: 'Terminé',
                color: '#888888',
                bgColor: 'rgba(136, 136, 136, 0.1)',
                icon: '✅'
            };
        }
    };

    // Filter events based on status and search term
    const filterEvents = (eventList: EventSummary[], currentFilter: EventFilter, search: string) => {
        let filtered = eventList;

        if (currentFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(event => {
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);

                switch (currentFilter) {
                    case 'active':
                        return event.isActive;
                    case 'upcoming':
                        return start > now;
                    case 'past':
                        return end < now;
                    default:
                        return true;
                }
            });
        }

        if (search.trim()) {
            filtered = filtered.filter(event =>
                (event.name?.toLowerCase().includes(search.toLowerCase())) ||
                (event.description?.toLowerCase().includes(search.toLowerCase()))
            );
        }

        return filtered;
    };

    // Calculate challenge completion percentage
    const getChallengeProgress = (event: EventSummary) => {
        if (event.totalChallenges === 0) return 0;
        return Math.round((event.availableChallenges / event.totalChallenges) * 100);
    };

    // Calculate duration in days
    const getEventDuration = (event: EventSummary) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Get filter counts
    const getFilterCounts = () => {
        const now = new Date();
        return {
            all: events.length,
            active: events.filter(e => e.isActive).length,
            upcoming: events.filter(e => new Date(e.startDate) > now).length,
            past: events.filter(e => new Date(e.endDate) < now).length
        };
    };

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('useEffect running, current events state:', events);
        }
        const cached = localStorage.getItem('cachedEventsSummary');
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (process.env.NODE_ENV === 'development') {
                    console.log('Cached data:', data, 'Timestamp:', timestamp);
                }
                if (Date.now() - timestamp < 1800000) {
                    setEvents(data);
                    setLoading(false);
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Loaded from cache:', data);
                    }
                    return;
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Cache parsing error:', err);
                }
                localStorage.removeItem('cachedEventsSummary');
            }
        }
        fetchEventsSummary();
    }, [refreshKey]);

    useEffect(() => {
        const filtered = filterEvents(events, filter, searchTerm);
        setFilteredEvents(filtered);
    }, [events, filter, searchTerm]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid #333',
                    borderTop: '3px solid #ffd700',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ fontSize: '1.2rem', color: '#ccc' }}>
                    Chargement des événements...
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
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😵</div>
                <p style={{ color: '#ff4444', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                    Oups ! {error}
                </p>
                <button
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        fetchEventsSummary();
                    }}
                    style={{
                        padding: '0.8rem 2rem',
                        backgroundColor: '#ffd700',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
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
                    🔄 Réessayer
                </button>
            </motion.div>
        );
    }

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.4, type: "spring" }
        },
        exit: {
            opacity: 0,
            y: -30,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    const counts = getFilterCounts();

    if (process.env.NODE_ENV === 'development') {
        console.log('Rendering', filteredEvents.length, 'filtered events out of', events.length, 'total events');
    }

    return (
        <div>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '3rem', marginBottom: '1rem', textAlign: 'center' }}
            >
                <h1 style={{
                    color: '#ffd700',
                    margin: '0',
                    fontSize: '2.5rem',
                    fontWeight: 'bold'
                }}>
                    🎮 Les dates
                </h1>
            </motion.div>

            {/* Zone recherche + filtres + refresh alignés */}
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
                {/* Barre de recherche */}
                <input
                    type="text"
                    placeholder="🔍 Rechercher un événement..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.6rem',
                        border: '2px solid #ffd700',
                        borderRadius: '8px',
                        backgroundColor: '#1a1a1a',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                        e.target.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                    }}
                    onBlur={(e) => {
                        e.target.style.boxShadow = 'none';
                    }}
                />

                {/* Filtres + bouton refresh alignés sur la même ligne */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: 'Tous', icon: '📋', count: counts.all },
                            { key: 'active', label: 'Actifs', icon: '🔥', count: counts.active },
                            { key: 'upcoming', label: 'À venir', icon: '⏳', count: counts.upcoming },
                            { key: 'past', label: 'Terminés', icon: '✅', count: counts.past }
                        ].map(({ key, label, icon, count }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key as EventFilter)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    border: `2px solid ${filter === key ? '#ffd700' : '#555'}`,
                                    borderRadius: '20px',
                                    backgroundColor: filter === key ? '#ffd700' : '#2a2a2a',
                                    color: filter === key ? '#000' : '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: filter === key ? 'bold' : 'normal',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {icon} {label} ({count})
                            </button>
                        ))}
                    </div>

                    {/* Bouton refresh à droite */}
                    <button
                        onClick={() => {
                            localStorage.removeItem('cachedEventsSummary');
                            setLoading(true);
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


            {searchTerm && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        color: '#ccc',
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        fontStyle: 'italic'
                    }}
                >
                    {filteredEvents.length} résultat{filteredEvents.length > 1 ? 's' : ''} pour "{searchTerm}"
                </motion.p>
            )}

            {filteredEvents.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: '#888',
                        fontSize: '1.1rem'
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {events.length === 0 ? '📅' : '🔍'}
                    </div>
                    <h3 style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                        {events.length === 0 ? 'Aucun événement disponible' : 'Aucun résultat'}
                    </h3>
                    <p>
                        {events.length === 0
                            ? 'Revenez plus tard pour découvrir nos prochains défis !'
                            : 'Essayez de modifier vos critères de recherche.'
                        }
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: 'transparent',
                                color: '#ffd700',
                                border: '1px solid #ffd700',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Effacer la recherche
                        </button>
                    )}
                </motion.div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={filter + searchTerm}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.08,
                                },
                            },
                        }}
                        style={{
                            display: 'grid',
                            gap: '1.5rem',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
                        }}
                    >
                        {filteredEvents.map((event) => {
                            const start = new Date(event.startDate);
                            const end = new Date(event.endDate);
                            const status = getEventStatus(event);
                            const progress = getChallengeProgress(event);
                            const duration = getEventDuration(event);
                            const day = format(start, 'dd');
                            const month = format(start, 'MMM', { locale: fr });
                            const dateString = `${format(start, 'dd/MM/yyyy (HH\'h\'mm)', { locale: fr })} - ${format(end, 'dd/MM/yyyy (HH\'h\'mm)', { locale: fr })}`;

                            return (
                                <motion.div
                                    key={event.id}
                                    variants={cardVariants}
                                    whileHover={{
                                        y: -5,
                                        boxShadow: '0 10px 30px rgba(255, 215, 0, 0.2)',
                                        transition: { duration: 0.2 }
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                                        border: '2px solid #ffd700',
                                        borderRadius: '16px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
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
                                        {status.icon} {status.text}
                                    </div>

                                    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div style={{ padding: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div style={{
                                                    width: '70px',
                                                    height: '70px',
                                                    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                                                    color: '#000',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: '1rem',
                                                    borderRadius: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    <div style={{ fontSize: '1.5rem' }}>{day}</div>
                                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{month}</div>
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>
                                                        {event.name}
                                                    </h3>
                                                    <p style={{ margin: 0, color: '#bbb', fontSize: '0.9rem' }}>
                                                        📅 {dateString} • ⏱️ {duration} jour{duration > 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                                                {event.description}
                                            </p>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <span style={{
                                                        color: '#ffd700',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        🎯 Défis disponibles
                                                    </span>
                                                    <span style={{
                                                        color: '#fff',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {event.availableChallenges}/{event.totalChallenges}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    width: '100%',
                                                    height: '8px',
                                                    backgroundColor: '#333',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.8, delay: 0.3 }}
                                                        style={{
                                                            height: '100%',
                                                            background: progress === 100
                                                                ? 'linear-gradient(90deg, #00ff88, #00cc6a)'
                                                                : 'linear-gradient(90deg, #ffd700, #ffed4e)',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span style={{ color: '#ffd700' }}>🎯 {event.availableChallenges}/{event.totalChallenges} défis</span>
                                                {progress === 100 && <span style={{ color: '#00ff88', marginLeft: '1rem' }}>✨ Complet</span>}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}

export default Events;