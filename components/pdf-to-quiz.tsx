'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import styles from './QuizCard.module.css'
import { Upload, FileText } from 'lucide-react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import pdfToText from 'react-pdftotext'
import axios from 'axios'

interface QuizQuestion {
  question: string;
  answer: string;
}

export function PdfToQuiz() {
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({ question: '', answer: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null); // Add loading message state


  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentQuestion((prevQuestion) => {
      const currentIndex = quizQuestions.indexOf(prevQuestion);
      const newIndex = (currentIndex + 1) % quizQuestions.length;
      return quizQuestions[newIndex];
    });
  };
  
  const handleBack = () => {
    setIsFlipped(false);
    setCurrentQuestion((prevQuestion) => {
      const currentIndex = quizQuestions.indexOf(prevQuestion);
      const newIndex = (currentIndex - 1 + quizQuestions.length) % quizQuestions.length;
      return quizQuestions[newIndex];
    });
  };


  const summarizeText = async (text: string) => {
    try {
      const response = await axios.post(
        'https://api.cohere.ai/v1/summarize',
        {
          text: text,
          length: 'medium'
        },
        {
          headers: {
            'Authorization': `Bearer cuk33MwL2INnZf6Chqrax8O2XFoQ1AoaYrQ2bYLk`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.summary || null; // Return null if summary is not present
    } catch (error) {
      console.error("Error summarizing text", error);
      return null; // Ensure it returns null on error
    }
  };


  const generateQuizQuestions = async (summary: string): Promise<{ questions: QuizQuestion[] }> => {
    try {
      const response = await axios.post(
        'https://api.cohere.com/v1/chat',
        {
          model: 'command-r-08-2024',
          message: `Based on this summary:\n\n${summary}\n\nPlease generate a JSON object with the following structure:\n{\n  "questions": [\n    {\n      "question": "What is the first question?",\n      "answer": "Answer to the first question"\n    },\n    {\n      "question": "What is the second question?",\n      "answer": "Answer to the second question"\n    }\n  ]\n}\n\nEach question should be basic and directly related to the summary, with answers being 1-2 words long. Generate a total of 10 questions and ensure the output follows this format.`,
          temperature: 0.3,
          stream: false,
          response_format: {
            type: "json_object"
          }
        },
        {
          headers: {
            'Authorization': `Bearer cuk33MwL2INnZf6Chqrax8O2XFoQ1AoaYrQ2bYLk`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      let text = data.text;

      if (text) {
        // Clean the response text
        text = text.replace(/```json\n|```/g, '').replace(/[\r\n\t]/g, '');

        // Parse the cleaned text
        const parsedText = JSON.parse(text);

        // Check if questions exist
        if (parsedText && Array.isArray(parsedText.questions)) {
          return parsedText; // Return the parsed questions
        } else {
          console.error("Error: parsedText.questions is undefined or empty");
          return { questions: [] }; // Return an empty array if questions not found
        }
      } else {
        console.error("Error: data.text is undefined or empty");
        return { questions: [] };
      }
    } catch (error) {
      console.error("Error generating quiz questions", error);
      return { questions: [] }; // Return empty array on error
    }
  };

  const extractTextFromPDF = async (pdfFile: File) => {
    try {
      const text = await pdfToText(pdfFile);
      return text || ''; // Ensure it returns an empty string if text is undefined
    } catch (error) {
      console.error("Failed to extract text from pdf", error);
      return ''; // Return empty string on error
    }
  };

  const handleSummarize = async () => {
    if (file) {
      setLoading(true); // Set loading to true when the function starts
      setLoadingMessage("Generating summary"); // Set loading message for summary generation

      const extractText = await extractTextFromPDF(file);
      if (extractText) {
        const summaryText = await summarizeText(extractText);
        if (summaryText) {
          setSummary(summaryText); // Set the summary state
          setLoadingMessage("Generating questions"); // Set loading message for question generation
          
          const questions = await generateQuizQuestions(summaryText);
          if (questions && questions.questions.length > 0) {
            setQuizQuestions(questions.questions);
            setCurrentQuestion(questions.questions[0]);
          } else {
            console.error("No questions generated.");
          }
        } else {
          console.error("Summary generation failed.");
        }
      } else {
        console.error("No text extracted from PDF.");
      }
      
      setLoading(false); // Set loading to false when the function finishes
      setLoadingMessage(null); // Clear loading message
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setFile(files[0])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              PDF to Quiz Cards
            </h1>
            <p className="text-muted-foreground">
              Turn your PDF into interactive quiz cards instantly.
            </p>
          </div>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors duration-200 ease-in-out"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {file ? (
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-6 w-6 text-primary" />
                <span className="font-medium truncate">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your PDF here</p>
                  <p className="text-sm text-muted-foreground">or</p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
                <Input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileInput}
                />
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center">
              <p>{loadingMessage}<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></p>
            </div>
          )}

          {!loading && quizQuestions && quizQuestions.length === 0 && (
            <Button className='w-full' onClick={handleSummarize} disabled={!file}>
              {file ? 'Create a Quiz Cards' : 'Upload a PDF to start'}
            </Button>
          )}
          {summary && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold">Summary:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
            </div>
          )}
          {!loading && quizQuestions && quizQuestions.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 relative">
              <h3 className="text-lg font-semibold">Quiz Questions:</h3>
              <div className={styles.flipcontainer} onClick={handleFlip}>
                <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}>
                  {/* Front Side */}
                  <div className={`${styles.front} bg-white border rounded-lg text-center px-16`}>
                    <strong>{currentQuestion.question}</strong>
                  </div>
                  {/* Back Side */}
                  <div className={`${styles.back} bg-white border rounded-lg text-center px-16`}>
                    {currentQuestion.answer}
                  </div>
                </div>
              </div>
              
              {/* Page Indicator */}
              <div className="text-center mt-2">
                {quizQuestions.indexOf(currentQuestion) + 1}/{quizQuestions.length}
              </div>
          
              {/* Arrow Icons */}
              <div className="absolute top-1/2 transform -translate-y-1/2 left-4">
                <button onClick={handleBack} className="flex items-center justify-center p-2 rounded-full text-black">
                  <ArrowBackIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="absolute top-1/2 transform -translate-y-1/2 right-4">
                <button onClick={handleNext} className="flex items-center justify-center p-2 rounded-full text-black">
                  <ArrowForwardIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}