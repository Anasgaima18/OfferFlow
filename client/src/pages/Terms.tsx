import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms = () => (
  <div className="min-h-screen bg-background text-white font-sans">
    <Navbar />
    <main className="pt-32 pb-24 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert prose-zinc">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: January 20, 2026</p>
        <p>By using OfferFlow, you agree to these terms. Please read them carefully.</p>
        <h3>1. Use of Service</h3>
        <p>OfferFlow provides AI-powered mock interview services. You must be at least 18 years old to use this service.</p>
        <h3>2. User Accounts</h3>
        <p>You are responsible for maintaining the security of your account credentials and for all activities under your account.</p>
        <h3>3. Acceptable Use</h3>
        <p>You agree not to misuse the service, attempt to gain unauthorized access, or use the service for any illegal purposes.</p>
        <h3>4. Intellectual Property</h3>
        <p>All content, features, and functionality are owned by OfferFlow and are protected by copyright and trademark laws.</p>
        <h3>5. Limitation of Liability</h3>
        <p>OfferFlow is provided "as is" without warranties. We are not liable for any damages arising from your use of the service.</p>
        <h3>6. Contact</h3>
        <p>For questions about these terms, contact us at legal@offerflow.ai</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
