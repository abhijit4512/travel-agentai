import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AssistantWidget from "./components/AssistantWidget";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { Skeleton } from "./components/ui";

// Each page is loaded only when visited (route-based code splitting).
const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore"));
const States = lazy(() => import("./pages/States"));
const StateDetail = lazy(() => import("./pages/StateDetail"));
const PlaceDetail = lazy(() => import("./pages/PlaceDetail"));
const Plan = lazy(() => import("./pages/Plan"));
const Chat = lazy(() => import("./pages/Chat"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Login = lazy(() => import("./pages/Login"));
const Saved = lazy(() => import("./pages/Saved"));
const SharedTrip = lazy(() => import("./pages/SharedTrip"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Compare = lazy(() => import("./pages/Compare"));
const Weekend = lazy(() => import("./pages/Weekend"));
const Seasons = lazy(() => import("./pages/Seasons"));
const Collections = lazy(() => import("./pages/Collections").then((m) => ({ default: m.Collections })));
const CollectionDetail = lazy(() => import("./pages/Collections").then((m) => ({ default: m.CollectionDetail })));
const About = lazy(() => import("./pages/Static").then((m) => ({ default: m.About })));
const Contact = lazy(() => import("./pages/Static").then((m) => ({ default: m.Contact })));
const Privacy = lazy(() => import("./pages/Static").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Static").then((m) => ({ default: m.Terms })));
const Help = lazy(() => import("./pages/Static").then((m) => ({ default: m.Help })));
const NotFound = lazy(() => import("./pages/Static").then((m) => ({ default: m.NotFound })));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
     <a className="skip" href="#main">Skip to content</a>
      <Navbar />
      <ScrollTop />
      <main id="main">
        <ErrorBoundary>
          <Suspense fallback={<div className="container page"><Skeleton height={320} /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/states" element={<States />} />
              <Route path="/states/:state" element={<StateDetail />} />
              <Route path="/destinations/:state/:slug" element={<PlaceDetail />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:slug" element={<CollectionDetail />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/weekend" element={<Weekend />} />
              <Route path="/seasons" element={<Seasons />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/shared/:token" element={<SharedTrip />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <AssistantWidget />
    </>
  );
}
