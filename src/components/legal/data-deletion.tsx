import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, LegalTable, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "differences", label: "Account controls" },
    { id: "immediate", label: "Delete your data" },
    { id: "other", label: "Other privacy requests" },
    { id: "limits", label: "Scope and limits" },
];

export default function DataDeletion() {
    return (
        <LegalDocument
            title="Account and data deletion"
            summary="How to choose which Hanami data to delete, what happens during the 14-day waiting period, and how to request deletion of other data."
            toc={toc}
            atAGlance={[
                "Signing out ends a session; disconnecting removes one sign-in method; neither deletes data.",
                "You can delete your osu!guessr data, your Hanami Bot data, your Hanami account, or any combination.",
                "Selected data is hidden at once and permanently deleted after 14 days unless you cancel.",
                "Discord and osu! provider accounts are never deleted. Email privacy@yorunoken.com for help with other data.",
            ]}
        >
            <LegalSection id="differences" title="1. Account controls">
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Effect</th>
                            <th>Important limit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sign out</td>
                            <td>Ends the current Hanami website session.</td>
                            <td>Does not remove account or product data.</td>
                        </tr>
                        <tr>
                            <td>Disconnect a sign-in method</td>
                            <td>Removes that Discord or osu! identity from the current Hanami account.</td>
                            <td>The final sign-in method cannot be removed. Provider accounts are never deleted.</td>
                        </tr>
                        <tr>
                            <td>Delete osu!guessr data</td>
                            <td>
                                Hides your osu!guessr profile, leaderboard entries, search results, score pages, and API keys, signs out
                                osu!guessr sessions, and permanently deletes your osu!guessr data after 14 days.
                            </td>
                            <td>Requires a linked osu! account. Challenges you created are kept without your name.</td>
                        </tr>
                        <tr>
                            <td>Delete Hanami Bot data</td>
                            <td>
                                Stops the Bot from using your linked osu! ID and permanently deletes your Bot user record and preferences
                                after 14 days.
                            </td>
                            <td>Requires a linked Discord account. Cached osu! scores and maps keyed to osu! IDs are not removed.</td>
                        </tr>
                        <tr>
                            <td>Delete Hanami account</td>
                            <td>
                                Includes Hanami Bot data. Revokes all Hanami sessions and the tokens and consents Hanami issued at once,
                                then permanently deletes the Hanami account after 14 days.
                            </td>
                            <td>Does not delete Discord or osu! provider accounts or operational logs.</td>
                        </tr>
                    </tbody>
                </LegalTable>
            </LegalSection>

            <LegalSection id="immediate" title="2. Delete your data">
                <ol>
                    <li>
                        Open <PrefetchLink href={routes.profilePrivacy}>account privacy</PrefetchLink> and review the signed-in account.
                    </li>
                    <li>
                        Choose what to delete: osu!guessr data, Hanami Bot data, Hanami account, or any combination. Selecting the Hanami
                        account also selects Hanami Bot data. An option is unavailable when the account it depends on is not linked.
                    </li>
                    <li>
                        Sign in again with a linked provider of your choice, Discord or osu!. Hanami requires a sign-in from approximately
                        the last 15 minutes.
                    </li>
                    <li>
                        Type <code>DELETE MY DATA</code> on the final confirmation screen. The screen shows the selected data and the date
                        on which it will be permanently deleted.
                    </li>
                </ol>

                <h3>The 14-day waiting period</h3>
                <p>
                    Deletion is scheduled for 14 days after you confirm. The wait protects against deletion by someone who has taken over
                    your account. Hanami does not send an email or Discord message about the schedule. From the moment you confirm,
                    everything you selected is hidden:
                </p>
                <ul>
                    <li>
                        Hanami account: all Hanami website sessions are signed out, and the OAuth tokens and consents Hanami issued to
                        connected apps are revoked.
                    </li>
                    <li>
                        osu!guessr data: your profile, leaderboard entries, search results, score pages, and API keys are hidden or stop
                        working, you are removed from any multiplayer lobby, and existing osu!guessr sessions are signed out.
                    </li>
                    <li>Hanami Bot data: the Bot stops using your linked osu! ID.</li>
                </ul>
                <p>
                    To cancel, sign in to Hanami during the 14 days. Account privacy shows a banner with the scheduled deletion date and a
                    Cancel button. Signing in to osu!guessr during the waiting period stops at a Hanami page that offers the same Cancel
                    button. Cancelling restores everything that was hidden. Sessions and tokens that were revoked are not restored, so you
                    sign in again as usual.
                </p>

                <h3>What is permanently deleted</h3>
                <p>After 14 days, a background job permanently deletes the selected data:</p>
                <ul>
                    <li>
                        osu!guessr data: your osu!guessr user record, completed games and their rounds, performance points (pp) and
                        achievements, badges, API keys, problem reports, and your per-answer content-statistics contributions.
                    </li>
                    <li>
                        Hanami Bot data: the Bot user record keyed to your Discord account, including its linked osu! ID and preferences.
                    </li>
                    <li>
                        Hanami account: the Hanami Web user, all connected provider records, osu! profile data, sessions, the tokens and
                        consent records Hanami issued to connected apps, deletion reauthentication records, and your Hanami supporter links,
                        status, claim codes, and the payment and membership records of your linked supporter accounts. Payments themselves
                        stay with Buy Me a Coffee or GitHub Sponsors and are not refunded.
                    </li>
                </ul>
                <p>
                    osu!guessr challenges you created are kept for other players, but the link to you as their creator is removed. Anonymous
                    aggregate content statistics, such as how often an item is answered correctly, are kept because they do not identify
                    you. If a service is temporarily unreachable when the job runs, the job retries later rather than reporting the deletion
                    as complete.
                </p>
            </LegalSection>

            <LegalSection id="other" title="3. Other privacy requests">
                <p>
                    Email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> if you cannot sign in, lost access to both
                    Discord and osu!, believe Hanami holds data outside the scopes above, or want access, correction, restriction,
                    portability, or objection rather than deletion.
                </p>
                <p>
                    Include the relevant Discord or osu! ID and which Hanami service you used. Do not send passwords, OAuth tokens, cookies,
                    API keys, backup codes, or government identity documents. Additional proportionate verification may be required. The
                    operator will explain any additional information needed and normally respond within 30 days.
                </p>
                <p>
                    Email is the practical contact path, but formal applications under Türkiye’s KVKK must follow the legally prescribed
                    method and content requirements. Hanami will provide an appropriate route when a request needs to be treated as a formal
                    KVKK application.
                </p>
            </LegalSection>

            <LegalSection id="limits" title="4. Scope and limits">
                <p>
                    Hanami cannot delete Discord or osu! provider accounts or provider-side records. Those must be handled through the
                    relevant provider. Cached osu! score and beatmap records in the Bot database are keyed to osu! IDs rather than to your
                    account and are refreshed or overwritten as the Bot operates. osu!guessr’s Score pp mode stores snapshots of public osu!
                    player and score data fetched from the osu! API that are not tied to an osu!guessr account; email the privacy contact to
                    ask for a snapshot to be removed.
                </p>
                <p>
                    Operational logs, private error-channel messages, abuse-prevention records, and analytics limitations may require
                    separate review or temporary retention for justified security or legal reasons. The repositories do not document a
                    production backup-retention schedule. Signing in with Discord or osu! after deletion may create a new Hanami account.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}
