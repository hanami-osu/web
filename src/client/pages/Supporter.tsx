import { Heart, Plus } from "lucide-react";

import { routes } from "@/client/routes/paths";
import { SupportPlatforms } from "@/components/account/support-platforms";
import { siteContainerClass } from "@/components/layout/styles";
import { TextLink } from "@/components/marketing";
import { ProductPage } from "@/components/product/product-layout";

const questions = [
    {
        title: "Is this the same account I use in osu!guessr and Hanami Bot?",
        answer: "Yes. osu!guessr signs you in with your Hanami account, and Hanami Bot uses it once your Discord is linked. Supporter time you add here counts everywhere.",
    },
    {
        title: "Where does my badge appear?",
        answer: "In osu!guessr, on your profile and the leaderboards. Your name also appears in the supporters list on the game’s homepage. You keep your badge after your support ends.",
    },
    {
        title: "How long does supporter time last?",
        answer: "A membership keeps you active while you subscribe. Each dollar of one-time support adds 10 days. Donations stack, and any saved days start counting down after your membership ends.",
    },
    {
        title: "Does supporting affect ranked play?",
        answer: "Ranked play stays the same for everyone. Additional supporter extras are planned for osu!guessr and Hanami Companion.",
    },
    {
        title: "Who handles payments and refunds?",
        answer: "The platform you pay through handles billing and refunds. Hanami keeps the account link and the supporter time your payment adds.",
    },
];

export default function Supporter() {
    return (
        <ProductPage>
            <div className={`${siteContainerClass} py-6 lg:py-14 sm:py-10`}>
                <div className="grid gap-7 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10">
                    <section className="relative isolate flex flex-col overflow-hidden rounded-2xl border border-accent/25 bg-[#241521] text-white">
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(32,18,31,.97)_5%,rgba(34,16,33,.72)_55%,rgba(29,14,32,.5)),url('/background.webp')] bg-cover bg-center"
                        />
                        <div className="relative z-10 px-6 pt-6 sm:px-8 sm:pt-8">
                            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Support Hanami</h1>
                            <p className="mt-3 max-w-[37ch] text-base leading-relaxed text-[#eadce4]">
                                Help cover hosting and development for osu!guessr and Hanami Bot, plus the bot’s osu!supporter tag. Give
                                once or join for <strong className="text-white">$3 a month.</strong>
                            </p>
                        </div>
                        <div className="relative mt-3 flex min-h-28 flex-1 items-end px-6 pb-5 lg:min-h-56 sm:min-h-36 sm:px-8 sm:pb-7">
                            <img
                                src="/hanami-transparent.png"
                                alt=""
                                width="565"
                                height="542"
                                className="pointer-events-none absolute right-1 bottom-0 h-full max-w-[59%] object-contain object-bottom lg:right-2"
                            />
                            <p className="relative flex max-w-[46%] flex-col items-start gap-2 font-display text-sm leading-snug font-semibold text-[#ffe3f0] sm:text-base">
                                <Heart aria-hidden="true" className="size-6 fill-accent text-accent" />
                                Keep your supporter badge forever.
                            </p>
                        </div>
                    </section>

                    <section id="platforms" aria-labelledby="platforms-title" className="scroll-mt-20">
                        <SupportPlatforms />
                    </section>
                </div>

                <section
                    className="mt-8 grid gap-x-8 border-t border-border pt-6 md:grid-cols-[1fr_2fr] sm:mt-10 sm:pt-8"
                    aria-labelledby="supporter-details"
                >
                    <div>
                        <h2 id="supporter-details" className="font-display text-xl font-semibold tracking-tight">
                            Supporter details
                        </h2>
                        <TextLink href={routes.legalTerms}>Terms of service</TextLink>
                    </div>
                    <div>
                        {questions.map(({ title, answer }) => (
                            <details key={title} className="group border-b border-border">
                                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold hover:text-accent-soft [&::-webkit-details-marker]:hidden">
                                    {title}
                                    <Plus aria-hidden="true" className="size-4 shrink-0 text-muted group-open:rotate-45" />
                                </summary>
                                <p className="max-w-[68ch] pb-4 text-sm leading-relaxed text-muted">{answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </div>
        </ProductPage>
    );
}
