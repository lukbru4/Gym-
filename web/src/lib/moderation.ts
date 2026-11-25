// Einfacher Wortfilter für Kommentare – gleiche Liste wie public.is_offensive() in supabase/schema.sql.
// Der Server prüft verbindlich; die App prüft vorab, damit man sofort einen Hinweis bekommt.
const BLOCKED =
  /(arschloch|hurensohn|wichser|fotze|missgeburt|spast|schlampe|nutte|fick|fuck|shit|bitch|cunt|nigg|neger|faggot|schwuchtel|bastard|kanake|behindert|retard|kys|kill yourself|bring dich um|nazi|heil hitler)/i;

export const isOffensive = (text: string) => BLOCKED.test(text);
export const COMMENT_MAX = 300;
