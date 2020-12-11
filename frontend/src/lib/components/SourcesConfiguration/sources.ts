export type SourceType = {
    id: string
    name: string
    comment: string
}


const _SOURCES: SourceType[] = [
    {id: "firebase", name: "Firebase", comment: "Firebase - an app development platform own by Google. Jitsu syncs firestore objects, users and many more"},
    {id: "google_play", name: "Google Play", comment: "Google Play is an mobile app store. Jitsu syncs earnings (revenue) and payouts"},
    {id: "google_analytics", name: "Google Analytics", comment: "Google Analytics is a website & app analytics. Jitsu syncs all data based on configured dimensions & keys"}
]


export const SOURCES: Record<string, SourceType> = _SOURCES.reduce((acc, val) => {acc[val.id] = val; return acc}, {});


