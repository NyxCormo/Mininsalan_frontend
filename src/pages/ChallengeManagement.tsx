import { useEffect, useState, Component } from 'react';
import type { ReactNode, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, addHours, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#ff4444' }}>
                    <h2>Une erreur est survenue</h2>
                    <button onClick={() => window.location.reload()}>Recharger la page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Types matching backend DTOs (using number for IDs to match frontend expectations)
interface Category {
    id: number;
    name: string;
}

interface Game {
    id: number;
    name: string;
    link: string;
    imagelink: string;
}

interface CustomEvent {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
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
    game: Game | null;
    event: CustomEvent | null;
    categories: Category[];
}

// Type for form state
interface NewChallengeForm {
    title: string;
    description: string;
    points: number;
    type: 'TEMPORARY' | 'PERMANENT' | 'RACE';
    reward: 'REDBULL' | 'PIZZA' | 'SNACK';
    releaseTime: string;
    endTime: string;
    game: Game | null;
    event: CustomEvent | null;
    categories: Category[];
}

function ChallengeManagement(): JSX.Element {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [events, setEvents] = useState<CustomEvent[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newChallenge, setNewChallenge] = useState<NewChallengeForm>({
        title: '',
        description: '',
        points: 0,
        type: 'TEMPORARY',
        reward: 'REDBULL',
        releaseTime: '',
        endTime: '',
        game: null,
        event: null,
        categories: []
    });
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [publishFromStart, setPublishFromStart] = useState(true);
    const [duration, setDuration] = useState(0); // in hours

    // Set initial publishFromStart and duration when editing
    useEffect(() => {
        if (editingChallenge && editingChallenge.event) {
            const eventStart = new Date(editingChallenge.event.startDate);
            const release = new Date(editingChallenge.releaseTime);
            setPublishFromStart(release.getTime() === eventStart.getTime());
            if (editingChallenge.type === 'TEMPORARY') {
                setDuration(differenceInHours(new Date(editingChallenge.endTime), release));
            }
        } else {
            setPublishFromStart(true);
            setDuration(0);
        }
    }, [editingChallenge]);

    // Fetch challenges, games, events, and categories
    const fetchData = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const [challengesRes, gamesRes, eventsRes, categoriesRes] = await Promise.all([
                fetch('http://localhost:8080/api/challenges'),
                fetch('http://localhost:8080/api/games'),
                fetch('http://localhost:8080/api/events/summary'),
                fetch('http://localhost:8080/api/categories')
            ]);

            if (!challengesRes.ok || !gamesRes.ok || !eventsRes.ok || !categoriesRes.ok) {
                throw new Error('Erreur lors du chargement des données');
            }

            const challengesData: Challenge[] = await challengesRes.json();
            const gamesData: Game[] = await gamesRes.json();
            const eventsData: CustomEvent[] = await eventsRes.json();
            const categoriesData: Category[] = await categoriesRes.json();

            setChallenges(challengesData);
            setGames(gamesData);
            setEvents(eventsData);
            setCategories(categoriesData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        void fetchData();
    }, []);

    // Create or update challenge
    const handleSaveChallenge = async (): Promise<void> => {
        try {
            setError(null);
            const method = editingChallenge ? 'PUT' : 'POST';
            const url = editingChallenge
                ? `http://localhost:8080/api/challenges/${editingChallenge.id}`
                : 'http://localhost:8080/api/challenges';

            // Get the current challenge data (either editing or new)
            const currentChallenge = editingChallenge || newChallenge;

            // Compute releaseTime and endTime
            const selectedEvent = currentChallenge.event || events.find(e => e.id === currentChallenge.event?.id);
            const computedReleaseTime = publishFromStart
                ? (selectedEvent?.startDate || '')
                : currentChallenge.releaseTime;

            let computedEndTime: string;
            if (currentChallenge.type === 'TEMPORARY') {
                const releaseDate = new Date(computedReleaseTime);
                if (isNaN(releaseDate.getTime())) {
                    throw new Error('Date de publication invalide');
                }
                computedEndTime = addHours(releaseDate, duration).toISOString();
            } else {
                computedEndTime = selectedEvent?.endDate || '';
            }

            if (!computedReleaseTime || !computedEndTime || !selectedEvent) {
                throw new Error('Veuillez sélectionner un événement valide');
            }

            if (!currentChallenge.game) {
                throw new Error('Veuillez sélectionner un jeu valide');
            }

            const body = {
                ...currentChallenge,
                releaseTime: computedReleaseTime,
                endTime: computedEndTime,
                game: currentChallenge.game,
                event: currentChallenge.event,
                categories: currentChallenge.categories
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
            }

            // Reset form
            setNewChallenge({
                title: '',
                description: '',
                points: 0,
                type: 'TEMPORARY',
                reward: 'REDBULL',
                releaseTime: '',
                endTime: '',
                game: null,
                event: null,
                categories: []
            });
            setEditingChallenge(null);
            setPublishFromStart(true);
            setDuration(0);

            await fetchData();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            console.error('Error saving challenge:', err);
        }
    };

    // Delete challenge
    const handleDeleteChallenge = async (id: number): Promise<void> => {
        try {
            setError(null);
            const response = await fetch(`http://localhost:8080/api/challenges/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
            }

            await fetchData();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            console.error('Error deleting challenge:', err);
        }
    };

    // Filter challenges
    const filteredChallenges = challenges.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (challenge.game?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (challenge.event?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    // Get the selected event's endDate for display
    const currentChallenge = editingChallenge || newChallenge;
    const selectedEvent = currentChallenge.event || events.find(e => e.id === currentChallenge.event?.id);
    const selectedEventEndDate = selectedEvent?.endDate || '';

    // Form validation
    const isFormValid = currentChallenge.title.trim() !== '' &&
        currentChallenge.game !== null &&
        currentChallenge.event !== null;

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
                    Chargement des défis...
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
                <button
                    onClick={() => {
                        setError(null);
                        void fetchData();
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
            </motion.div>
        );
    }

    return (
        <ErrorBoundary>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '2rem', marginBottom: '2rem' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Link
                            to="/"
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
                            🎯 Gestion des Défis
                        </h1>
                    </div>
                </motion.div>

                {/* Form for adding/editing challenge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                        border: '2px solid #ffd700',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '2rem'
                    }}
                >
                    <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
                        {editingChallenge ? 'Modifier le Défi' : 'Ajouter un Nouveau Défi'}
                    </h2>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Titre du défi"
                            value={currentChallenge.title}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, title: value });
                                } else {
                                    setNewChallenge({ ...newChallenge, title: value });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <textarea
                            placeholder="Description"
                            value={currentChallenge.description}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, description: value });
                                } else {
                                    setNewChallenge({ ...newChallenge, description: value });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                minHeight: '100px'
                            }}
                        />
                        <input
                            type="number"
                            placeholder="Points"
                            value={currentChallenge.points}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, points: value });
                                } else {
                                    setNewChallenge({ ...newChallenge, points: value });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <select
                            value={currentChallenge.type}
                            onChange={(e) => {
                                const type = e.target.value as 'TEMPORARY' | 'PERMANENT' | 'RACE';
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, type });
                                } else {
                                    setNewChallenge({ ...newChallenge, type });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        >
                            <option value="TEMPORARY">Temporaire</option>
                            <option value="PERMANENT">Permanent</option>
                            <option value="RACE">Course</option>
                        </select>
                        <select
                            value={currentChallenge.reward}
                            onChange={(e) => {
                                const reward = e.target.value as 'REDBULL' | 'PIZZA' | 'SNACK';
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, reward });
                                } else {
                                    setNewChallenge({ ...newChallenge, reward });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        >
                            <option value="REDBULL">Red Bull</option>
                            <option value="PIZZA">Pizza</option>
                            <option value="SNACK">Snack</option>
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="checkbox"
                                checked={publishFromStart}
                                onChange={(e) => setPublishFromStart(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <label style={{ color: '#ccc', fontSize: '1rem' }}>Publier dès le début</label>
                        </div>
                        {!publishFromStart && (
                            <input
                                type="datetime-local"
                                value={currentChallenge.releaseTime.slice(0, 16)}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (editingChallenge) {
                                        setEditingChallenge({ ...editingChallenge, releaseTime: value });
                                    } else {
                                        setNewChallenge({ ...newChallenge, releaseTime: value });
                                    }
                                }}
                                style={{
                                    padding: '0.8rem',
                                    border: '2px solid #ffd700',
                                    borderRadius: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        )}
                        {currentChallenge.type === 'TEMPORARY' ? (
                            <input
                                type="number"
                                placeholder="Durée (heures)"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                style={{
                                    padding: '0.8rem',
                                    border: '2px solid #ffd700',
                                    borderRadius: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        ) : (
                            <div style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#ccc',
                                fontSize: '1rem'
                            }}>
                                Date de fin: {selectedEventEndDate ? format(new Date(selectedEventEndDate), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'Sélectionnez un événement'}
                            </div>
                        )}
                        <select
                            value={currentChallenge.game?.id || ''}
                            onChange={(e) => {
                                const gameId = e.target.value;
                                const game = gameId ? games.find(g => g.id === Number(gameId)) || null : null;
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, game });
                                } else {
                                    setNewChallenge({ ...newChallenge, game });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        >
                            <option value="">Sélectionner un jeu</option>
                            {games.map(game => (
                                <option key={game.id} value={game.id}>{game.name}</option>
                            ))}
                        </select>
                        <select
                            value={currentChallenge.event?.id || ''}
                            onChange={(e) => {
                                const eventId = e.target.value;
                                const event = eventId ? events.find(ev => ev.id === Number(eventId)) || null : null;
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, event });
                                } else {
                                    setNewChallenge({ ...newChallenge, event });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        >
                            <option value="">Sélectionner un événement</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>{event.name}</option>
                            ))}
                        </select>
                        <select
                            multiple
                            value={currentChallenge.categories.map(c => c.id.toString())}
                            onChange={(e) => {
                                const selectedIds = Array.from(e.target.selectedOptions, option => Number(option.value));
                                const selectedCategories = categories.filter(c => selectedIds.includes(c.id));
                                if (editingChallenge) {
                                    setEditingChallenge({ ...editingChallenge, categories: selectedCategories });
                                } else {
                                    setNewChallenge({ ...newChallenge, categories: selectedCategories });
                                }
                            }}
                            style={{
                                padding: '0.8rem',
                                border: '2px solid #ffd700',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                minHeight: '100px'
                            }}
                        >
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => void handleSaveChallenge()}
                                disabled={!isFormValid}
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    backgroundColor: isFormValid ? '#ffd700' : '#555',
                                    color: isFormValid ? '#000' : '#888',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {editingChallenge ? 'Mettre à jour' : 'Ajouter'}
                            </button>
                            {editingChallenge && (
                                <button
                                    onClick={() => {
                                        setEditingChallenge(null);
                                        setPublishFromStart(true);
                                        setDuration(0);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '0.8rem',
                                        backgroundColor: '#ff4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Annuler
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ marginBottom: '2rem' }}
                >
                    <input
                        type="text"
                        placeholder="🔍 Rechercher par titre, jeu ou événement..."
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
                        <p>Essayez de modifier votre recherche.</p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={searchTerm}
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
                                const rewardInfo = {
                                    REDBULL: { icon: '🥤', name: 'Red Bull', color: '#ff4444' },
                                    PIZZA: { icon: '🍕', name: 'Pizza', color: '#ff8800' },
                                    SNACK: { icon: '🍿', name: 'Snack', color: '#ffd700' }
                                }[challenge.reward] || { icon: '🎁', name: 'Récompense', color: '#ffd700' };

                                const typeInfo = {
                                    RACE: { icon: '🏁', name: 'Course', color: '#ff4444' },
                                    TEMPORARY: { icon: '⏱️', name: 'Temporaire', color: '#ff8800' },
                                    PERMANENT: { icon: '♾️', name: 'Permanent', color: '#00ff88' }
                                }[challenge.type] || { icon: '🎯', name: 'Défi', color: '#ffd700' };

                                return (
                                    <motion.div
                                        key={challenge.id}
                                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.4, delay: index * 0.05 }}
                                        whileHover={{
                                            y: -5,
                                            boxShadow: `0 10px 30px ${typeInfo.color}20`,
                                            transition: { duration: 0.2 }
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                                            border: `2px solid ${typeInfo.color}`,
                                            borderRadius: '16px',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ padding: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    background: challenge.game?.imagelink
                                                        ? `url(${challenge.game.imagelink})`
                                                        : 'linear-gradient(135deg, #ffd700, #ffed4e)',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    marginRight: '1rem',
                                                    borderRadius: '12px'
                                                }} />
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                                                        {challenge.title}
                                                    </h3>
                                                    <p style={{ color: '#ccc', fontSize: '0.9rem', margin: 0 }}>
                                                        Jeu: {challenge.game?.name ?? 'Non spécifié'}
                                                    </p>
                                                </div>
                                            </div>
                                            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                                {challenge.description}
                                            </p>
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                <span style={{ color: '#ffd700', fontSize: '1rem', fontWeight: 'bold' }}>
                                                    🏆 {challenge.points} pts
                                                </span>
                                                <span style={{ color: rewardInfo.color, fontSize: '0.9rem' }}>
                                                    {rewardInfo.icon} {rewardInfo.name}
                                                </span>
                                            </div>
                                            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                                Événement: {challenge.event?.name ?? 'Non spécifié'}
                                            </p>
                                            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                                Début: {format(new Date(challenge.releaseTime), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                            </p>
                                            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                                Fin: {format(new Date(challenge.endTime), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                            </p>
                                            {challenge.categories.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
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
                                            )}
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => setEditingChallenge(challenge)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.8rem',
                                                        backgroundColor: '#00ff88',
                                                        color: '#000',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    ✏️ Modifier
                                                </button>
                                                <button
                                                    onClick={() => void handleDeleteChallenge(challenge.id)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.8rem',
                                                        backgroundColor: '#ff4444',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '1rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    🗑️ Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </ErrorBoundary>
    );
}

export default ChallengeManagement;