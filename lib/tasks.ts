/** Onboarding task definitions (product config, not mock content). */

export const DEFAULT_TASKS = [
  { id: 'reg', name: 'השלם הרשמה', pts: 15 },
  { id: 'about', name: 'מלא פרטים אישיים', pts: 10 },
  { id: 'hobbies', name: 'בחר תחביבים', pts: 5 },
  { id: 'social', name: 'חבר רשת חברתית', pts: 10 },
  { id: 'photo', name: 'העלה תמונת פרופיל', pts: 10 },
  { id: 'bio', name: 'כתוב ביו', pts: 10 },
  { id: 'browse', name: 'צפה ב-5 דירות', pts: 5 },
  { id: 'fav', name: 'שמור דירה למועדפים', pts: 10 },
  { id: 'chat', name: 'שלח הודעה ראשונה', pts: 10 },
  { id: 'meet', name: 'קבע פגישה ראשונה', pts: 10 },
  { id: 'invite', name: 'הזמן חבר ל-RooMate', pts: 5 },
] as const;

export type TaskId = (typeof DEFAULT_TASKS)[number]['id'];
