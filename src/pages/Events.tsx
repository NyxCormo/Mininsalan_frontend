import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

interface EventDate {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    duration: number;
}

function Events() {
    const [events, setEvents] = useState<EventDate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Fetching events from /api/events/dates');
        }
        try {
            const response = await fetch('/api/events/dates');
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetch response status:', response.status, response.statusText);
            }
            if (!response.ok) {
                throw new Error(`Échec de la récupération des événements: ${response.statusText}`);
            }
            const data: EventDate[] = await response.json();
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetch result:', data);
            }
            setEvents(data);
            localStorage.setItem('cachedEvents', JSON.stringify({ data, timestamp: Date.now() }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetch error:', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('useEffect running, current events state:', events);
        }
        const cached = localStorage.getItem('cachedEvents');
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (process.env.NODE_ENV === 'development') {
                    console.log('Cached data:', data, 'Timestamp:', timestamp);
                }
                if (Date.now() - timestamp < 3600000) { // 1 heure
                    setEvents(data);
                    setLoading(false);
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Loaded from cache:', data);
                    }
                    return;
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('Cache parsing error:', err);
                }
            }
        }
        fetchEvents();
    }, []);

    if (loading) {
        return <div>Chargement...</div>;
    }

    if (error) {
        return (
            <div>
                <p>Erreur: {error}</p>
                <button
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        fetchEvents();
                    }}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    if (process.env.NODE_ENV === 'development') {
        console.log('Rendering', events.length, 'events');
    }

    return (
        <div>
            {events.length === 0 ? (
                <p>Aucun événement disponible.</p>
            ) : (
                <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.2, // Apparition séquentielle
                            },
                        },
                    }}
                    style={{ listStyle: 'none', padding: 0 }}
                >
                    {events.map((event) => {
                        const start = new Date(event.startDate);
                        const end = new Date(event.endDate);
                        const day = format(start, 'dd');
                        const month = format(start, 'MMM', { locale: fr });
                        const dateString = `${format(start, 'EEEE dd MMMM (HH\'h\'mm)', { locale: fr })} -> ${format(end, 'EEEE dd MMMM (HH\'h\'mm)', { locale: fr })}`;

                        return (
                            <motion.li
                                key={event.id}
                                variants={cardVariants}
                                style={{
                                    marginBottom: '1rem',
                                    padding: '1rem',
                                    border: '2px solid #ffd700', // Jaune
                                    boxShadow: '0 0 10px #ffd700', // Glow jaune
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#2a2a2a',
                                    width: '100%',
                                }}
                            >
                                <Link
                                    to={`/events/${event.id}`}
                                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}
                                >
                                    <div
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            border: '1px solid #ffd700',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: '1rem',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{day}</div>
                                        <div>{month}</div>
                                    </div>
                                    <div
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            border: '1px solid #ffd700',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: '1rem',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{event.duration}h</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0 }}>{event.name}</h3>
                                        <p style={{ margin: '0.5rem 0' }}>{dateString}</p>
                                    </div>
                                </Link>
                            </motion.li>
                        );
                    })}
                </motion.ul>
            )}
        </div>
    );
}

export default Events;