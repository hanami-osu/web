import { siteConfig } from "@/data/site-config";
import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, LegalTable, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "controller", label: "Who operates Hanami" },
    { id: "scope", label: "Services covered" },
    { id: "data", label: "Data processed" },
    { id: "purposes", label: "Purposes and legal bases" },
    { id: "sharing", label: "Third parties" },
    { id: "retention", label: "Retention" },
    { id: "security", label: "Security" },
    { id: "rights", label: "Your choices and rights" },
    { id: "children", label: "Children" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact" },
];

export default function PrivacyPolicy() {
    return (
        <LegalDocument
            title="Privacy policy"
            summary="How the Hanami website, Hanami Bot, and osu!guessr process information."
            toc={toc}
            atAGlance={[
                "The website, Bot, and osu!guessr have different data stores and service roles.",
                "Discord and osu! identities can be linked to one Hanami account when you choose to do so.",
                "You can schedule deletion of your osu!guessr data, Hanami Bot data, or Hanami account; provider accounts are never deleted.",
                "Privacy questions and requests go to privacy@yorunoken.com.",
            ]}
        >
            <LegalSection id="controller" title="1. Who operates Hanami">
                <p>
                    Hanami is an independent community project operated by Yorunoken from Türkiye. In this policy, “Hanami”, “we”, “us”, and
                    “the operator” refer to the operator of the hosted Hanami services described below.
                </p>
                <p>
                    The operator is based in Türkiye. Hanami-controlled production infrastructure is hosted in Germany, so the operator’s
                    location and the location of the servers are not the same.
                </p>
                <p>
                    Privacy and personal-data requests can be sent to{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. The Discord community server is not an official
                    privacy-request channel. Do not send passwords, session cookies, OAuth tokens, API keys, or backup codes.
                </p>
            </LegalSection>

            <LegalSection id="scope" title="2. Services covered">
                <p>
                    This policy covers the Hanami services operated by the controller: this website and account area, Hanami Bot on Discord,
                    and the separately hosted osu!guessr service.
                </p>
            </LegalSection>

            <LegalSection id="data" title="3. Data processed">
                <h3>Hanami Web and connected sign-in methods</h3>
                <ul>
                    <li>
                        Discord account ID, display name, avatar URL, provider scope, and an email address when Discord supplies one. For a
                        phone-only Discord account, Hanami stores a stable non-deliverable address under the reserved <code>.invalid</code>{" "}
                        domain required by the authentication schema; it is not treated as verified contact information or used for mail.
                    </li>
                    <li>osu! account ID, username, avatar URL, and provider scope when you sign in or connect with osu!.</li>
                    <li>
                        OAuth account records, which may include Discord or osu! access and refresh tokens when Better Auth receives them.
                    </li>
                    <li>Web session token, session dates, IP address, and user-agent string stored by Better Auth.</li>
                    <li>Short-lived OAuth verification values used to complete authentication safely.</li>
                    <li>
                        When you sign in to osu!guessr through Hanami, Hanami Web acts as its OpenID Connect provider and stores the access
                        tokens it issues, any refresh tokens, consent records, and the app's client registration. ID tokens are signed with
                        keys Hanami Web stores.
                    </li>
                    <li>
                        Bot-issued account links store the Discord ID, supplied name and avatar snapshot, a SHA-256 ticket hash, and
                        creation, expiry, consumption, or invalidation dates. The URL token itself is not stored.
                    </li>
                    <li>
                        Ordinary request metadata processed by Cloudflare in front of the public sites, including IP address, request and
                        device information, and security signals described in Cloudflare’s privacy policy.
                    </li>
                </ul>

                <h3>Accounts linked to Hanami Bot</h3>
                <ul>
                    <li>
                        When one Hanami account owns both a Discord and osu! identity, Hanami mirrors those provider IDs into the Bot
                        database so supported commands can use the linked osu! profile.
                    </li>
                    <li>
                        Disconnecting either provider removes the corresponding Bot association. The Bot database remains separate from the
                        Hanami Web account database.
                    </li>
                    <li>
                        The Bot status view may request a public osu! username, avatar URL, and global rank for display. Those returned
                        profile fields are not written by that route.
                    </li>
                </ul>

                <h3>Hanami supporter</h3>
                <ul>
                    <li>
                        When you link GitHub to receive supporter status, Hanami stores that account’s ID, its login, and the link date. The
                        OAuth access token is used once to read your identity and GitHub sponsorship status, including a one-time payment,
                        and is not stored. Buy Me a Coffee is linked with a one-time claim code that you paste into your support note;
                        Hanami stores a SHA-256 hash of the code with its creation, expiry, and use dates, and then the Buy Me a Coffee
                        supporter ID and name.
                    </li>
                    <li>
                        GitHub and Buy Me a Coffee send signed webhooks when a membership changes or a one-time payment is made. Hanami
                        stores the platform supporter ID, whether the membership is active, and for one-time payments the platform’s payment
                        ID, the amount in US dollars, the supporter days it grants, and the payment and refund dates. Email addresses and
                        payment details in those webhooks are not stored. Payments made before an account is linked are kept under the
                        platform supporter ID until it is linked.
                    </li>
                    <li>
                        For each account, Hanami stores whether it has the supporter badge and since when, the remaining donated time, and
                        whether a linked membership is active. Apps you sign in to with the <code>supporter</code> scope, such as
                        osu!guessr, receive the badge, active status, and end date of donated time.
                    </li>
                </ul>

                <h3>Scheduled data deletion</h3>
                <ul>
                    <li>
                        A signed-in user may choose to delete osu!guessr data, Hanami Bot data, the Hanami account, or any combination.
                        Deleting the account includes Bot data. Scheduling requires a sign-in with a linked Discord or osu! account from
                        approximately the last 15 minutes and deliberate typed confirmation.
                    </li>
                    <li>
                        A short-lived reauthentication challenge stores the Hanami user ID, a SHA-256 hash of a random challenge token,
                        creation and expiry dates, and reauthentication and consumption dates. OAuth tokens and session cookies are not
                        stored in that record.
                    </li>
                    <li>
                        A deletion schedule stores the Hanami user ID, the selected scopes, the linked Discord and osu! IDs at the time of
                        the request, the request date, the permanent-deletion date, and the time and short error code of the last failed
                        deletion attempt, if any.
                    </li>
                    <li>
                        Selected data is hidden as soon as deletion is scheduled and permanently deleted 14 days later unless the user
                        cancels. The account scope revokes all Hanami sessions and the tokens and consents Hanami issued at once. The
                        osu!guessr scope hides the profile, leaderboard entries, search results, score pages, and API keys and signs out
                        osu!guessr sessions. The Bot scope stops the Bot from using the linked osu! ID. Cancelling restores what was hidden.
                    </li>
                    <li>
                        Permanent deletion removes, for the osu!guessr scope, the osu!guessr user record, games and rounds, pp and
                        achievements, badges, API keys, reports, and per-answer contributions; for the Bot scope, the Hanami Bot user row
                        and preferences; and for the account scope, the Hanami Web user, all connected provider records, osu! profile data,
                        supporter links, status, claim codes, and the membership and payment records of linked supporter accounts, sessions,
                        and the tokens and consent records Hanami issued to connected apps. Challenges the user created are kept with the
                        creator removed, and anonymous aggregate content statistics are kept. Cached osu! score and beatmap records in the
                        Bot database are keyed to osu! IDs rather than to the account and are not removed.
                    </li>
                </ul>

                <h3>Hanami Bot</h3>
                <ul>
                    <li>
                        Discord user ID, linked osu! ID, and bot preferences: default game mode, score source, embed size, and embed style.
                    </li>
                    <li>Discord guild ID, guild name, owner ID, join time, and custom command prefixes.</li>
                    <li>
                        Cached beatmap and score records, including osu! user and map IDs, game mode, mods, score, accuracy, combo, grade,
                        hit counts, state, completion time, and performance points where used by bot features.
                    </li>
                    <li>
                        Aggregate command counters keyed by command and invocation type. These database counters are not keyed to a user.
                    </li>
                    <li>
                        Operational log entries containing command name, Discord user ID and username, guild ID and name, timestamps, and
                        error details.
                    </li>
                    <li>
                        On a command failure, the user, guild, and channel context and the error details may be sent to a configured private
                        Discord error channel accessible to the operator and maintainers authorized to diagnose production errors. For
                        prefix commands this includes the message content.
                    </li>
                    <li>
                        Temporary Redis button state, including the initiating Discord user ID, with a one-hour code-defined lifetime;
                        in-memory command cooldowns are shorter-lived.
                    </li>
                </ul>

                <h3>osu!guessr</h3>
                <ul>
                    <li>osu! user ID, username, and avatar URL received at sign-in, plus an authentication-session cookie.</li>
                    <li>
                        Sign-in to osu!guessr runs through Hanami Web. Signing in for the first time also creates a Hanami Web account that
                        holds the osu! identity data listed above for Hanami Web.
                    </li>
                    <li>
                        Completed game records and derived statistics: mode, variant, points, streaks, totals, games played, per-game
                        performance points (pp), achievements, and play times. Profiles and leaderboards make some of this information
                        public.
                    </li>
                    <li>
                        For the Score pp mode, snapshots of public osu! player and score data fetched from the osu! API: osu! user ID,
                        username, avatar URL, global rank, and top-score details such as beatmap, mods, accuracy, combo, hit counts, and pp.
                        These players may not be osu!guessr users, and the snapshots are not tied to an osu!guessr account.
                    </li>
                    <li>
                        Per-answer content statistics keyed to the osu! user ID (item, whether the answer was correct, and response time),
                        shareable challenges that record the creating user, and badges and an optional profile banner URL shown on profiles.
                    </li>
                    <li>
                        Multiplayer lobby state in Redis for up to about four hours, including each player's osu! user ID, username, avatar
                        URL, points, and round results, plus short-lived realtime connection tokens and presence records.
                    </li>
                    <li>
                        Problem reports containing osu! user ID, mapset ID, report category, free-text description, status, and timestamps.
                        Report content may also be sent to a configured Discord webhook.
                    </li>
                    <li>
                        API-key name, creation and last-used dates, and a SHA-256 hash of the key. The raw key is returned once to the user.
                    </li>
                    <li>
                        One-hour Redis game state containing the osu! user ID, current item, guesses, correctness, points, streaks, timing,
                        and game progress; short Redis locks and rate-limit counters are also used.
                    </li>
                    <li>
                        Browser preferences (audio volume, audio autoplay, and shortcut-panel state) in local storage, locale in local
                        storage and a cookie, and game-session identifiers in session storage.
                    </li>
                    <li>
                        Production pages load self-hosted Umami for aggregate analytics. Umami is configured to operate without analytics
                        cookies. Request and device information may be processed to derive aggregate session and location metrics; raw IP
                        addresses are not intended to be stored by the analytics service.
                    </li>
                </ul>

                <h3>Technical requests and external media</h3>
                <p>
                    Account pages may load avatar images from Discord or osu! hosts. Those providers receive ordinary web-request data such
                    as IP address, user agent, requested URL, and timing when the browser contacts them.
                </p>
            </LegalSection>

            <LegalSection id="purposes" title="4. Purposes and legal bases">
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Purpose</th>
                            <th>Legal basis</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                Authenticate users, keep sessions, link accounts, run games, answer commands, and save requested settings.
                            </td>
                            <td>Performance of a contract or steps requested by the user.</td>
                        </tr>
                        <tr>
                            <td>Link supporter accounts and track memberships and one-time payments to grant supporter status.</td>
                            <td>Performance of a contract or steps requested by the user.</td>
                        </tr>
                        <tr>
                            <td>Prevent abuse, secure OAuth flows, rate-limit actions, diagnose failures, and maintain availability.</td>
                            <td>Legitimate interests in operating and protecting the services.</td>
                        </tr>
                        <tr>
                            <td>Verify and carry out scheduled data deletion and handle other privacy requests.</td>
                            <td>
                                Compliance with applicable legal obligations and legitimate interests in accurate, secure request handling.
                            </td>
                        </tr>
                        <tr>
                            <td>Measure aggregate osu!guessr usage and service reliability.</td>
                            <td>Legitimate interests in understanding and maintaining the service, subject to applicable law.</td>
                        </tr>
                        <tr>
                            <td>Meet binding legal obligations and respond to valid legal process.</td>
                            <td>Compliance with legal obligations.</td>
                        </tr>
                    </tbody>
                </LegalTable>
            </LegalSection>

            <LegalSection id="sharing" title="5. Third parties and international processing">
                <p>
                    Data is transmitted as needed to Discord for sign-in, bot operation, webhooks, and error reporting; to osu! for sign-in
                    and API lookups; to GitHub when you link it for supporter status; and to Cloudflare as the public sites’ proxy and
                    network provider. GitHub and Buy Me a Coffee process supporter payments under their own terms and send Hanami the
                    webhooks described above. Hanami-controlled application, database, Redis, and self-hosted Umami infrastructure is hosted
                    in Germany.
                </p>
                <p>
                    The operator manages the services from Türkiye while Hanami-controlled production data is processed on infrastructure in
                    Germany. Processing may also cross other national borders because Discord, osu!, and some service providers operate
                    internationally. Third-party handling is governed by each provider’s own terms, privacy notice, and applicable transfer
                    mechanisms. The public repositories do not establish the physical location of every provider request or the operator’s
                    production-access roster.
                </p>
                <p>
                    See the providers’ own notices, including{" "}
                    <a href={siteConfig.links.discordPrivacy} target="_blank" rel="noreferrer">
                        Discord’s privacy policy
                    </a>
                    ,{" "}
                    <a href={siteConfig.links.osuPrivacy} target="_blank" rel="noreferrer">
                        osu!’s privacy policy
                    </a>
                    , and{" "}
                    <a href={siteConfig.links.cloudflarePrivacy} target="_blank" rel="noreferrer">
                        Cloudflare’s privacy policy
                    </a>
                    . Those notices do not replace Hanami’s responsibilities for its own processing.
                </p>
            </LegalSection>

            <LegalSection id="retention" title="6. Retention">
                <ul>
                    <li>
                        Hanami web’s default Better Auth session lifetime is approximately seven days. Database session and OAuth
                        verification records include expiry dates.
                    </li>
                    <li>
                        Supporter claim codes expire after seven days and supporter link requests after ten minutes. Supporter links,
                        status, and credited payment records are kept while the Hanami account exists; unlinking a platform keeps the time
                        already credited. Payments and memberships from platform accounts that were never linked are kept so they can be
                        credited if the account is linked later; ask the privacy contact to have them removed.
                    </li>
                    <li>
                        Bot file logging keeps at most 30 <code>.log</code> files in the configured directory and removes older named files
                        when a new log file is selected. The code does not specify a retention period for container, host, Cloudflare,
                        Discord error-channel, or other operational logs.
                    </li>
                    <li>
                        Bot pagination state is configured for one hour. osu!guessr game state and item sets are configured for one hour,
                        and multiplayer lobby state for about four hours; report rate limits for ten minutes; and API-key rate-limit
                        counters for their code-defined window.
                    </li>
                    <li>
                        osu!guessr’s Auth.js session default is approximately 30 days. Its locale cookie is configured for about one year.
                        Local-storage values remain until the user clears them or application code changes them; session storage normally
                        lasts for the browser-tab session.
                    </li>
                    <li>
                        Account, provider-link, preference, guild, completed-game, report, and API-key metadata remain while the related
                        account or feature is active, until the user deletes or revokes them where a control exists, or until Hanami no
                        longer needs them for the service, security, or a legal obligation. Cached scores and maps are refreshed or
                        overwritten as the services operate. The source does not define a general automatic deletion schedule for these
                        database rows. The analytics service applies its configured retention settings.
                    </li>
                    <li>Short-lived account-deletion reauthentication challenges expire after approximately 15 minutes.</li>
                    <li>
                        Data selected for deletion is hidden for a 14-day waiting period and then permanently deleted by a background job,
                        unless the user cancels first. The deletion schedule itself is removed when deletion completes or is cancelled.
                    </li>
                    <li>
                        Score pp snapshots are stored in generated batches, and new batches replace older ones in the game. The code does
                        not define an automatic deletion schedule for older batches.
                    </li>
                    <li>
                        Bot-issued account links expire after approximately five minutes; osu! authorization state expires after ten
                        minutes.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection id="security" title="7. Security">
                <p>
                    The code we reviewed includes HTTP-only same-site session cookies, hashed osu!guessr API keys, OAuth state or
                    verification records, parameterized database queries, rate limits, and log redaction for common secret patterns.
                    Application configuration expects secrets in environment variables, and the repositories instruct contributors not to
                    commit production credentials. Repository inspection cannot verify every deployment control or guarantee absolute
                    security.
                </p>
            </LegalSection>

            <LegalSection id="rights" title="8. Your choices and rights">
                <p>
                    Depending on where you live, you may be entitled to request access, correction, deletion, restriction, portability, or
                    objection, and to withdraw consent where consent is used. This includes rights available under Türkiye’s Personal Data
                    Protection Law and, where it applies, the GDPR. Hanami will respond without undue delay and normally within 30 days.
                </p>
                <p>
                    Signing out only ends a session. Disconnecting a Discord or osu! identity removes that sign-in method from the Hanami
                    account, and the final sign-in method cannot be removed. Signed-in users can schedule deletion of their osu!guessr data,
                    Hanami Bot data, Hanami account, or any combination from the <a href="/profile/privacy">account privacy area</a>.
                    Selected data is hidden at once and permanently deleted after 14 days; signing in during that period allows the user to
                    cancel and restore it. Provider-side data is outside that action. See the{" "}
                    <a href="/legal/data-deletion">data deletion page</a> for details.
                </p>
                <p>
                    In-app deletion uses fresh Discord or osu! OAuth authentication, with a provider already linked to the signed-in Hanami
                    user, and a short-lived, single-use challenge. Users who cannot sign in or need deletion outside the in-app scopes may
                    email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. Public usernames or numeric provider IDs
                    alone are not sufficient; proportionate additional verification may be required. Do not email government identity
                    documents. Hanami will explain any additional information needed and normally respond within 30 days.
                </p>
                <p>
                    The privacy email is an operational contact channel. Under Türkiye’s formal KVKK application rules, an ordinary email
                    qualifies only when it was previously provided to and recorded by the controller; the rules also permit written, KEP,
                    secure-electronic-signature, mobile-signature, and purpose-built application routes. Formal KVKK applications must be
                    made in Turkish and contain the information required by the applicable communiqué. Contact Hanami first if you need an
                    appropriate formal route, and review the{" "}
                    <a href={siteConfig.links.kvkkRequests} target="_blank" rel="noreferrer">
                        KVKK application procedure
                    </a>
                    .
                </p>
                <p>
                    Some records may be anonymized rather than deleted, and justified security, abuse-prevention, or legal records may
                    remain temporarily. No source-backed backup retention schedule was found. Discord and osu! independently control
                    provider-side data, which must be managed through those providers.
                </p>
            </LegalSection>

            <LegalSection id="children" title="9. Children and eligibility">
                <p>
                    You must be at least 13 and meet any higher minimum age imposed by the law or platform rules in your region. If you are
                    old enough to use the services but not old enough to enter a binding agreement where you live, a parent or legal
                    guardian must agree to these terms on your behalf. Hanami does not knowingly provide the services to anyone below the
                    applicable minimum age.
                </p>
            </LegalSection>

            <LegalSection id="changes" title="10. Changes to this policy">
                <p>
                    Material changes will be posted on this page with a new effective date and, where appropriate, announced through the
                    website or community server before they take effect. Changes required urgently for security or law may take effect
                    sooner, with notice provided as soon as reasonably possible.
                </p>
            </LegalSection>

            <LegalSection id="contact" title="11. Contact and complaints">
                <p>
                    Privacy and personal-data requests: <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. Hanami is
                    operated from Türkiye and does not publish a separate postal office. The email can be used to obtain a suitable formal
                    route; it does not replace the application methods required by law. You may also complain to the{" "}
                    <a href={siteConfig.links.kvkk} target="_blank" rel="noreferrer">
                        Turkish Personal Data Protection Authority
                    </a>{" "}
                    or another data-protection authority available to you under applicable law.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}
