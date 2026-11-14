import Profile from "@/client/pages/Profile";

import { getRouteMetadata } from "../../seo";

export const metadata = getRouteMetadata("/profile");

export default function ProfilePage() {
    return <Profile />;
}
