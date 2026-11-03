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
const Login = lazy(() => import("./pages/login"));
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
const Cars = lazy(() => import("./pages/travel/Cars"));
const Hotels = lazy(() => import("./pages/travel/Hotels"));
const Transport = lazy(() => import("./pages/travel/Transport"));
const Memories = lazy(() => import("./pages/memories/Memories"));
const AlbumDetail = lazy(() => import("./pages/memories/AlbumDetail"));
const SharedAlbum = lazy(() => import("./pages/memories/SharedAlbum"));
const MyTravel = lazy(() => import("./pages/MyTravel"));
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));
const NotFound = lazy(() => import("./pages/Static").then((m) => ({ default: m.NotFound })));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const admin = pathname.startsWith("/admin");
  const authPage = pathname === "/login";

  return (
    <>
      {!admin && !authPage && <a className="skip" href="#main">Skip to content</a>}
      {!admin && !authPage && <Navbar />}
      <ScrollTop />
      <main id="main" className={authPage ? "auth-main" : undefined}>
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
              <Route path="/cars" element={<Cars />} />
              <Route path="/hotels" element={<Hotels />} />
              <Route path="/bus" element={<Transport mode="bus" />} />
              <Route path="/train" element={<Transport mode="train" />} />
              <Route path="/flights" element={<Transport mode="flight" />} />
              <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
              <Route path="/memories/shared/:token" element={<SharedAlbum />} />
              <Route path="/memories/:id" element={<ProtectedRoute><AlbumDetail /></ProtectedRoute>} />
              <Route path="/my" element={<ProtectedRoute><MyTravel /></ProtectedRoute>} />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!admin && !authPage && <Footer />}
      {!admin && !authPage && <AssistantWidget />}
    </>
  );
}
