import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { usePageMeta } from '../hooks/usePageMeta';

const Privacy = () => {
  usePageMeta({
    title: 'Privacy Policy — OfferFlow',
    description: 'Learn how OfferFlow collects, uses, and protects your personal information and interview data. Enterprise-grade encryption for all data.',
  });

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-3xl mx-auto prose prose-invert prose-zinc">
          <h1>Privacy Policy</h1>
          <p className="lead">Last updated: January 20, 2026</p>

          <p>
            At OfferFlow, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website features.
          </p>

          <h2>1. Data Collection</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website (such as posting messages in our online forums or entering competitions, contests or giveaways) or otherwise when you contact us.
          </p>

          <h2>2. Interview Data</h2>
          <p>
            When you use our mock interview services, we process audio and video data to provide the service. This data is transcribed and analyzed to generate feedback.
          </p>
          <ul>
            <li>Audio recordings are processed for transcription.</li>
            <li>Video analysis is performed locally or securely transmitted for expression analysis.</li>
            <li>Code submissions are executed in isolated environments.</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>

          <h2>4. Contact Us</h2>
          <p>
            If you have questions or comments about this policy, you may email us at privacy@offerflow.ai
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
