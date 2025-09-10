import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// Types based on GameDto
interface Game {
    id: number;
    name: string;
    link: string;
    imagelink: string;
}

function GameManagement() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newGame, setNewGame] = useState({ name: '', link: '', imagelink: '' });
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch games
    const fetchGames = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/games');
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            const data: Game[] = await response.json();
            setGames(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    // Load games on mount
    useEffect(() => {
        fetchGames();
    }, []);

    // Create or update game
    const handleSaveGame = async () => {
        try {
            const method = editingGame ? 'PUT' : 'POST';
            const url = editingGame ? `/api/games/${editingGame.id}` : '/api/games';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingGame || newGame),
            });
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            setNewGame({ name: '', link: '', imagelink: '' });
            setEditingGame(null);
            fetchGames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    // Delete game
    const handleDeleteGame = async (id: number) => {
        try {
            const response = await fetch(`/api/games/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            fetchGames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    // Filter games
    const filteredGames = games.filter(game =>
        game.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    Chargement des jeux...
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
                        fetchGames();
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
                        🎮 Gestion des Jeux
                    </h1>
                </div>
            </motion.div>

            {/* Form for adding/editing game */}
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
                    {editingGame ? 'Modifier le Jeu' : 'Ajouter un Nouveau Jeu'}
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nom du jeu"
                        value={editingGame ? editingGame.name : newGame.name}
                        onChange={(e) => {
                            if (editingGame) {
                                setEditingGame({ ...editingGame, name: e.target.value });
                            } else {
                                setNewGame({ ...newGame, name: e.target.value });
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
                    <input
                        type="text"
                        placeholder="Lien du jeu"
                        value={editingGame ? editingGame.link : newGame.link}
                        onChange={(e) => {
                            if (editingGame) {
                                setEditingGame({ ...editingGame, link: e.target.value });
                            } else {
                                setNewGame({ ...newGame, link: e.target.value });
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
                    <input
                        type="text"
                        placeholder="Lien de l'image"
                        value={editingGame ? editingGame.imagelink : newGame.imagelink}
                        onChange={(e) => {
                            if (editingGame) {
                                setEditingGame({ ...editingGame, imagelink: e.target.value });
                            } else {
                                setNewGame({ ...newGame, imagelink: e.target.value });
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
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleSaveGame}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                backgroundColor: '#ffd700',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {editingGame ? 'Mettre à jour' : 'Ajouter'}
                        </button>
                        {editingGame && (
                            <button
                                onClick={() => setEditingGame(null)}
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
                    placeholder="🔍 Rechercher par nom de jeu..."
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

            {/* Games Grid */}
            {filteredGames.length === 0 ? (
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
                    <h3 style={{ color: '#ccc', marginBottom: '0.5rem' }}>Aucun jeu trouvé</h3>
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
                        {filteredGames.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
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
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            background: game.imagelink
                                                ? `url(${game.imagelink})`
                                                : 'linear-gradient(135deg, #ffd700, #ffed4e)',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            marginRight: '1rem',
                                            borderRadius: '12px'
                                        }} />
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                                            {game.name}
                                        </h3>
                                    </div>
                                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                        Lien: <a href={game.link} target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>
                                        {game.link}
                                    </a>
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setEditingGame(game)}
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
                                            onClick={() => handleDeleteGame(game.id)}
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
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}

export default GameManagement;