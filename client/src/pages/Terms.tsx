import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import SurfaceCard from '../components/ui/SurfaceCard';
import BlurFade from '../components/ui/BlurFade';

const sections = [
  ['Use of Service', 'OfferFlow provides AI-powered mock interview services. You must be at least 18 years old to use this service.'],
  ['User Accounts', 'You are responsible for maintaining the security of your account credentials and for all activities under your account.'],
  ['Acceptable Use', 'You agree not to misuse the service, attempt to gain unauthorized access, or use the service for illegal purposes.'],
  ['Intellectual Property', 'All content, features, and functionality are owned by OfferFlow and are protected by copyright and trademark laws.'],
  ['Limitation of Liability', 'OfferFlow is provided "as is" without warranties. We are not liable for damages arising from use of the service.'],
  ['Contact', 'For questions about these terms, contact legal@offerflow.ai.'],
] as const;

const Terms = () => {
  usePageMeta({
    title: 'Terms of Service — OfferFlow',
    description: 'Read the OfferFlow Terms of Service covering acceptable use, user accounts, intellectual property, and limitation of liability.',
  });

  return (
  <PageLayout contentClassName="max-w-5xl">
      <PageHero
        kicker="Legal"
        title="TERMS OF SERVICE"
        description="The operating rules for using OfferFlow, including access, acceptable use, account responsibility, and platform ownership."
        meta={[
          { label: 'Updated', value: 'Jan 2026' },
          { label: 'Applies to', value: 'All Users' },
          { label: 'Contact', value: 'legal@offerflow.ai' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">These terms define how the platform can be used and what responsibilities users and the service each carry.</p>}
      />
      <div className="space-y-5 content-prose">
        {sections.map(([title, body], index) => (
          <BlurFade key={title} delay={index * 0.04}>
            <SurfaceCard className="premium-panel p-6 md:p-8 border-white/10">
              <h2 className="text-2xl text-white mb-3">{title}</h2>
              <p>{body}</p>
            </SurfaceCard>
          </BlurFade>
        ))}
      </div>
  </PageLayout>
  );
};

export default Terms;
