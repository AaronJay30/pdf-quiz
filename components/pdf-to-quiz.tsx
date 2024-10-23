'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import styles from './QuizCard.module.css'
import { Upload, FileText } from 'lucide-react'

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({ question: '', answer: '' });


  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentQuestionIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % quizQuestions.length;
      setCurrentQuestion(quizQuestions[newIndex]);  // Update current question
      return newIndex;
    });
  };
  
  const handleBack = () => {
    setIsFlipped(false);
    setCurrentQuestionIndex((prevIndex) => {
      const newIndex = (prevIndex - 1 + quizQuestions.length) % quizQuestions.length;
      setCurrentQuestion(quizQuestions[newIndex]);  // Update current question
      return newIndex;
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
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error summarizing text", error);
    }
  };

   const generateQuizQuestions = async (summary: string) => {
    try {
      const response = await axios.post(
        'https://api.cohere.com/v1/chat',
        {
          model: 'command-r-08-2024',
          message: `Based on this summary \n\n${summary}. \n\n Generate 10 basic questions that can be found in the summary  for reviewer in JSON format. Each question should be paired with a corresponding answer and answer basically should be 1-2 words only.`,
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
  
      const data = await response.data;
      let text = data.text;
      
      if (text) {
        // Remove the ```json and ``` from the string
        text = text.replace(/```json\n|```/g, '');
      
        // Remove \r, \n, and \t characters
        text = text.replace(/[\r\n\t]/g, '');
      
        // Parse the cleaned text
        const parsedText = JSON.parse(text);
      
        console.log(parsedText.questions);
        setQuizQuestions(parsedText.questions);
        setCurrentQuestion(parsedText.questions[0]);
      } else {
        console.error("Error: data.text is undefined or empty");
      }
    } catch (error) {
      console.error("Error generating quiz questions", error);
    }
  };

  const extractTextFromPDF = async (pdfFile: File) => {
    try {
      const text = await pdfToText(pdfFile);
      summarizeText(text);
      generateQuizQuestions(text);
    } catch (error) {
      console.error("Failed to extract text from pdf", error);
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

  const handleSummarize = async () => {
    if (file) {
      await extractTextFromPDF(file);
      if (summary) {
        await generateQuizQuestions(summary);
      }
    }
  };

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

          {quizQuestions && quizQuestions.length === 0 && (
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
          {quizQuestions && quizQuestions.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold">Quiz Questions:</h3>
              <div className={styles.flipcontainer} onClick={handleFlip}>
                <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}>
                  {/* Front Side */}
                  <div className={`${styles.front} bg-white border rounded-lg`}>
                    <strong>{currentQuestion.question}</strong>
                  </div>
                  {/* Back Side */}
                  <div className={`${styles.back} bg-white border rounded-lg`}>
                    {currentQuestion.answer}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={handleBack}>Back</button>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}