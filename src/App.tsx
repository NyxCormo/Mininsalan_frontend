import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import SpecificEvent from './pages/SpecificEvent';
import './App.css';

function Main() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes>
                <Route
                    path="/"
                    element={
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Home />
                        </motion.div>
                    }
                />
                <Route
                    path="/about"
                    element={
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                        >
                            <About />
                        </motion.div>
                    }
                />
                <Route
                    path="/events"
                    element={
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Events />
                        </motion.div>
                    }
                />
                <Route
                    path="/events/:id"
                    element={
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SpecificEvent />
                        </motion.div>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    return (
        <Router>
            <nav>
                <Link to="/">Home</Link> | <Link to="/about">About</Link> | <Link to="/events">Events</Link>
            </nav>
            <Main />
        </Router>
    );
}

export default App;