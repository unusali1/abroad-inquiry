"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import chatIcon from "../../public/assets/chatIcon.png";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@iconify/react";
import axios from "axios";
import { marked } from "marked";
import { TypingIndicator } from "./TypingIndicator";
import chatBg from "../../public/assets/chatBg.png";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const MessageAndCall = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const textareaRef = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userIp, setUserIp] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "bot",
      text: `👋Hello! I’m Abroad Inquiry, here to help you navigate your educational opportunities abroad. How can I assist you today?`,
      date: "",
      isWrite: false,
      copy: false,
      like: false,
      dislike: false,
    },
  ]);

  useEffect(() => {
    const savedChatHistory = localStorage.getItem("chatHistory");
    if (savedChatHistory) {
      setChatHistory(JSON.parse(savedChatHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  function formatDate(date) {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return new Date(date).toLocaleString("en-GB", options);
  }

  const getLocalIP = async () => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.createDataChannel("");
    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer));

    return new Promise((resolve) => {
      peerConnection.onicecandidate = (event) => {
        if (event && event.candidate) {
          const localIP = event.candidate.address;
          resolve(localIP);
          peerConnection.close();
        }
      };
    });
  };

  useEffect(() => {
    getLocalIP()
      .then((ip) => {
        setUserIp(ip);
      })
      .catch((error) => console.error("Error fetching local IP:", error));
  }, []);

  const handleSendMessage = (suggest) => {
    if (!message.trim() && !suggest) return;
    const date = new Date();
    const userMessage = {
      sender: "user",
      text: message || suggest,
      date: date,
    };
    setChatHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    const data = {
      query: message || suggest,
      userId: userIp,
      domain: "https://www.abroadinquiry.com/",
    };
   
    axios
      .post(
        `https://abroad-inquiry-ai-new-api-607757000261.us-central1.run.app/chat`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
      .then((res) => {
        const botResponse = {
          sender: "bot",
          text: res.data.response || "Sorry, I didn't understand that.",
          date: date,
          isWrite: true,
          copy: true,
          like: true,
          dislike: true,
        };
        setChatHistory((prev) => [...prev, botResponse]);
        setMessage("");
        setRecordingTime(0);
      })
      .catch((error) => {
        const errorResponse = {
          sender: "bot",
          text: "An error occurred while connecting to the server. Please try again later.",
        };
        setChatHistory((prev) => [...prev, errorResponse]);
        setMessage("");
        console.error("Error:", error.response?.data || error.message);
      })
      .finally(() => {
        setLoading(false);
        resetTranscript();
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e) => {
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    const maxRows = 3;
    const lineHeight = parseInt(
      window.getComputedStyle(textarea).lineHeight,
      10
    );
    const maxHeight = lineHeight * maxRows;

    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "scroll";
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  };

  const deleteChatHistory = () => {
    setChatHistory([
      {
        sender: "bot",
        text: `👋Hello! I’m Abroad Inquiry, here to help you navigate your educational opportunities abroad. How can I assist you today?`,
      },
    ]);
    localStorage.removeItem("chatHistory");
  };

  const [typedText, setTypedText] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);

  const lastBotMessage = chatHistory
    .filter((msg) => msg.sender === "bot")
    .pop(); // Get last bot message

  useEffect(() => {
    if (lastBotMessage && lastBotMessage.isWrite) {
      setTypedText(""); // Ensure it's cleared first
      setIsTypingDone(false);

      let i = 0;
      const textToType = lastBotMessage.text; // Store it in a variable to avoid potential re-renders

      const type = () => {
        if (i < textToType.length) {
          setTypedText((prev) => prev + textToType.charAt(i));
          i++;
          setTimeout(type, 20);
        } else {
          setChatHistory((prevChatHistory) =>
            prevChatHistory.map((msg) =>
              msg === lastBotMessage ? { ...msg, isWrite: false } : msg
            )
          );
          setIsTypingDone(true);
        }
      };

      type();
    } else {
      setTypedText(lastBotMessage?.text || "");
      setIsTypingDone(true);
    }
  }, [lastBotMessage, chatHistory.length]);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Voice to text implementation

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingActive, setRecordingActive] = useState(false);

  useEffect(() => {
    let interval;
    if (recordingActive) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [recordingActive]);

  const startRecording = () => {
    SpeechRecognition.startListening({
      continuous: true,
      language: "en-US",
    });
    setRecordingActive(true);
  };

  const stopRecording = () => {
    SpeechRecognition.stopListening();
    setRecordingActive(false);
    handleSendMessage(transcript);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <>
      <div>
        {isPopoverOpen ? null : (
          <div className="fixed bottom-4 right-20 bg-orange-50 text-[10px] rounded-tl-full rounded-bl-full rounded-br-full p-2 shadow-xl cursor-pointer">
            <p>Chat with us </p>
          </div>
        )}
        <div className="fixed bottom-4 right-4 bg-blue-700 rounded-full p-3 shadow-lg cursor-pointer hover:bg-blue-600 overflow-hidden">
          <Popover onOpenChange={(open) => setIsPopoverOpen(open)}>
            <PopoverTrigger asChild>
              {isPopoverOpen ? (
                <ChevronDownIcon className="h-7 w-7 text-white" />
              ) : (
                <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7 text-white" />
              )}
            </PopoverTrigger>

            <PopoverContent className="w-96  p-0 bg-transparent shadow-none border-none mr-4 mt-2 overflow-hidden">
              <div className="w-full">
                <div className="w-96  mx-auto border rounded-lg shadow-lg">
                  <div
                    className="p-4 rounded-t-lg flex items-center justify-between"
                    style={{
                      background:
                        "linear-gradient(90deg, #3543b0 0%, #8066a7 100%)",
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10  rounded-full flex items-center justify-center">
                        <Image
                          src={chatIcon}
                          alt="Chatbot Logo"
                          className="w-12 h-12 mt-2"
                          width={40}
                          height={40}
                        />
                      </div>
                      <div>
                        <h4 className="text-white text-lg font-semibold">
                          Abroad Inquiry
                        </h4>
                        <p className="text-sm text-gray-200 font-semibold">
                          Education Consultant
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="relative group">
                        <TrashIcon
                          className="h-6 w-6 text-white mr-3 cursor-pointer"
                          onClick={deleteChatHistory}
                        />
                        {/* Tooltip Below */}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Delete
                        </span>
                      </div>

                      {/* <button className="text-white text-xl focus:outline-none">
                        &#x2022;&#x2022;&#x2022;
                      </button> */}
                    </div>
                  </div>

                  <div
                    ref={chatContainerRef}
                    className="p-4 min-h-96 max-h-96 overflow-y-auto space-y-4"
                    style={{
                      backgroundImage: `url(${chatBg.src})`, // Use `.src` to get the path
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {chatHistory.map((msg, index) => (
                      <ul className="space-y-5" key={index}>
                        {msg.sender === "bot" ? (
                          <li className="max-w-lg flex gap-x-2 sm:gap-x-4 me-11">
                            <div>
                              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 dark:bg-neutral-900 dark:border-neutral-700">
                                <div className="space-y-1.5">
                                  {/* {msg === lastBotMessage ? typedText : msg.text} */}
                                  <div
                                    className="mb-1.5 text-sm text-gray-800 dark:text-white"
                                    dangerouslySetInnerHTML={{
                                      __html: marked(
                                        msg === lastBotMessage
                                          ? typedText
                                          : msg.text
                                      ),
                                    }}
                                  />
                                </div>
                              </div>
                              {isTypingDone && (
                                <span className="mt-1.5 ml-4 ms-auto flex items-center gap-x-1 text-xs text-gray-500 dark:text-neutral-500">
                                  {msg?.date && (
                                    <p className=" text-[12px] text-bold text-blue-600">
                                      {formatDate(msg?.date)}
                                    </p>
                                  )}
                                  {msg?.copy && (
                                    <div className="relative group">
                                      <Icon
                                        icon="lets-icons:copy-light"
                                        width={28}
                                        height={28}
                                        className="text-gray-400 hover:text-blue-800 transition border border-gray-400 rounded-sm p-1"
                                      />
                                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Copy
                                      </span>
                                    </div>
                                  )}

                                  {msg?.like && (
                                    <div className="relative group">
                                      <Icon
                                        icon="iconamoon:like"
                                        width={28}
                                        height={28}
                                        onClick={stopRecording}
                                        className="text-gray-400 hover:text-blue-800 transition border border-gray-400 rounded-sm p-1"
                                      />
                                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Like
                                      </span>
                                    </div>
                                  )}

                                  {msg?.dislike && (
                                    <div className="relative group">
                                      <Icon
                                        icon="iconamoon:dislike"
                                        width={28}
                                        height={28}
                                        onClick={stopRecording}
                                        className="text-gray-400 hover:text-blue-800 transition border border-gray-400 rounded-sm p-1"
                                      />
                                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Dislike
                                      </span>
                                    </div>
                                  )}
                                </span>
                              )}
                            </div>
                          </li>
                        ) : (
                          <li className="flex ms-auto gap-x-2 sm:gap-x-4">
                            <div className="grow text-end space-y-3">
                              <div className="inline-flex flex-col justify-end">
                                <div className="inline-block bg-blue-600 rounded-2xl p-4 shadow-sm">
                                  <div
                                    className="text-sm text-white"
                                    dangerouslySetInnerHTML={{
                                      __html: marked(msg.text),
                                    }}
                                  />
                                </div>

                                <span className="mt-1.5 mr-1 ms-auto flex items-center gap-x-1 text-xs text-gray-500 dark:text-neutral-500">
                                  <svg
                                    className="shrink-0 size-3"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <path d="M18 6 7 17l-5-5"></path>
                                    <path d="m22 10-7.5 7.5L13 16"></path>
                                  </svg>
                                  Sent
                                  {msg?.date && (
                                    <p className=" text-[12px] text-bold text-blue-600">
                                      {formatDate(msg?.date)}
                                    </p>
                                  )}
                                </span>
                              </div>
                            </div>
                          </li>
                        )}
                      </ul>
                    ))}
                    {loading && (
                      <div className="flex flex-row items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Image
                            src={chatIcon}
                            alt="Chatbot Logo"
                            className="w-8 h-8 rounded-full"
                            width={40}
                            height={40}
                          />
                        </div>

                        <div className="flex justify-start">
                          <TypingIndicator />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 px-4 py-2 bg-white border-t">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder="write your message..."
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onInput={handleInput}
                      onKeyDown={handleKeyDown}
                      disabled={loading || listening}
                      className="flex-1 resize-none bg-white border-none outline-none m-2 font-[12px]"
                      style={{ lineHeight: "1.5em" }}
                    />

                    {listening ? (
                      <div className="flex px-2 space-x-2">
                        <div className="flex bg-red-600 px-2 py-1 rounded-2xl space-x-3">
                          <Icon
                            icon="iconoir:voice"
                            width={20}
                            height={20}
                            className="text-white hover:text-blue-800 transition-all transform hover:scale-110 animate-pulse"
                          />

                          <p className="text-white text-sm">
                            {formatTime(recordingTime)}
                          </p>
                        </div>

                        <Icon
                          icon="lsicon:stop-filled"
                          width={28}
                          height={28}
                          onClick={stopRecording}
                          className="text-blue-600 hover:text-blue-800 transition"
                        />
                      </div>
                    ) : (
                      <Icon
                        icon="mingcute:voice-line"
                        width={25}
                        height={25}
                        onClick={startRecording}
                        className={`text-blue-600 hover:text-blue-800 transition ${
                          message ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        style={{ pointerEvents: message ? "none" : "auto" }} // Prevent clicking when disabled
                      />
                    )}

                    {!message.trim() ? null : (
                      <button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className={`p-2 rounded-full text-white ${
                          message.trim()
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-300 cursor-not-allowed"
                        }`}
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Footer Branding */}
                  <div className="bg-white flex items-center justify-center py-4 px-6 space-x-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Icon
                        icon="ri:facebook-fill"
                        width={12}
                        height={12}
                        className="text-blue-600 hover:text-blue-800 transition"
                      />
                      <Separator
                        orientation="vertical"
                        className="h-5 border-l border-gray-300"
                      />
                      <Icon
                        icon="basil:linkedin-solid"
                        width={15}
                        height={15}
                        className="text-blue-500 hover:text-blue-700 transition"
                      />
                      <Separator
                        orientation="vertical"
                        className="h-5 border-l border-gray-300"
                      />
                    </div>
                    <p className="text-[12px] text-gray-600">
                      Powered by{" "}
                      <span className="font-semibold text-gray-800">
                        NeuroBrain
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
};

export default MessageAndCall;
