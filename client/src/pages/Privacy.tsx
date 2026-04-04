import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import SurfaceCard from '../components/ui/SurfaceCard';
import BlurFade from '../components/ui/BlurFade';

const sections = [
  {
    title: 'Data Collection',
    body: 'We collect personal information you provide when you register, ask for product information, or participate in product experiences. This includes the information needed to create your account and support your interview workflow.',
  },
  {
    title: 'Interview Data',
    body: 'When you use mock interviews, we process interview inputs to deliver the service and generate feedback. Audio is used for transcription, video signals may be processed for analysis, and code submissions run in isolated execution environments.',
    bullets: [
      'Audio recordings are processed for transcription.',
      'Video analysis is performed locally or securely transmitted for expression analysis.',
      'Code submissions are executed in isolated environments.',
    ],
  },
  {
    title: 'Data Security',
    body: 'We use administrative, technical, and physical security measures to protect your information. No system can guarantee perfect security, but the platform is designed with strong baseline protections and controlled access in mind.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions or comments about this policy, contact privacy@offerflow.ai.',
  },
];

const Privacy = () => {
  usePageMeta({
    title: 'Privacy Policy — OfferFlow',
    description: 'Learn how OfferFlow collects, uses, and protects your personal information and interview data. Enterprise-grade encryption for all data.',
  });

  return (
    <PageLayout contentClassName="max-w-5xl">
      <PageHero
        kicker="Legal"
        title="PRIVACY POLICY"
        description="A clear view of what data OfferFlow collects, why it is processed, and how it is handled when you use the interview platform."
        meta={[
          { label: 'Updated', value: 'Jan 2026' },
          { label: 'Policy scope', value: 'Account + Interview Data' },
          { label: 'Contact', value: 'privacy@offerflow.ai' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">We treat privacy as a product responsibility, not a footer detail. This summary explains the operational basics in plain language.</p>}
      />
      <div className="space-y-5 content-prose">
        {sections.map((section, index) => (
          <BlurFade key={section.title} delay={index * 0.04}>
            <SurfaceCard className="premium-panel p-6 md:p-8 border-white/10">
              <h2 className="text-2xl text-white mb-3">{section.title}</h2>
              <p>{section.body}</p>
              {section.bullets ? (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </SurfaceCard>
          </BlurFade>
        ))}
      </div>
    </PageLayout>
  );
};

export default Privacy;
