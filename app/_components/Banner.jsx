"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import heroImg from "../../public/assets/homeHero.png";
import homeImg from "../../public/assets/homePage.png";
import chatImg from "../../public/assets/chatImg.webp";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Banner = () => {
  const router = useRouter();
  return (
    <>
      <div>
        <Image
          src={homeImg}
          width={1120}
          height={1620}
          alt="Chat Icon"
          className="h-full w-full"
        />
      </div>
    </>
  );
};

export default Banner;
