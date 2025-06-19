import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

interface Verse {
  text: string;
  chapter: number;
  verse: number;
  translation: string;
}

const verses: Verse[] = [
  {
    text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
    chapter: 2,
    verse: 47,
    translation: "You have the right to perform your actions, but never to the fruits of actions."
  },
  {
    text: "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।",
    chapter: 4,
    verse: 7,
    translation: "Whenever there is a decline in righteousness and an increase in unrighteousness, O Arjuna, at that time I manifest myself on earth."
  },
  {
    text: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।",
    chapter: 2,
    verse: 48,
    translation: "Perform your duty equipoised, O Arjuna, abandoning all attachment to success or failure."
  },
  {
    text: "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।",
    chapter: 3,
    verse: 35,
    translation: "Better is one's own dharma, though imperfectly performed, than the dharma of another well performed."
  },
  {
    text: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।",
    chapter: 18,
    verse: 66,
    translation: "Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reactions."
  },
  {
    text: "मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय।",
    chapter: 7,
    verse: 7,
    translation: "O conqueror of wealth, there is nothing superior to Me."
  },
  {
    text: "बुद्धिर्ज्ञानमसम्मोहः क्षमा सत्यं दमः शमः।",
    chapter: 10,
    verse: 4,
    translation: "Intelligence, knowledge, freedom from doubt and delusion, forgiveness, truthfulness, control of the senses, control of the mind."
  }
];

export const DailyVerse = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const verseOfTheDay = verses[dayOfYear % verses.length];

  return (
    <Card className="p-6 bg-gradient-to-br from-sacred-50 to-sacred-100 border-sacred-200 shadow-sacred animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-full bg-sacred-200/50">
          <Quote className="h-5 w-5 text-sacred-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sacred-800 mb-3 font-inter">Daily Verse</h3>
          <blockquote className="font-crimson text-lg text-sacred-700 mb-3 italic leading-relaxed">
            {verseOfTheDay.text}
          </blockquote>
          <p className="text-sacred-600 mb-2 leading-relaxed">
            {verseOfTheDay.translation}
          </p>
          <cite className="text-sm text-sacred-500 font-medium">
            — Bhagavad Gita {verseOfTheDay.chapter}.{verseOfTheDay.verse}
          </cite>
        </div>
      </div>
    </Card>
  );
};