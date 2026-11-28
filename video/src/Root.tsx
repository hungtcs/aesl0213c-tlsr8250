import React from "react";
import { Composition, Still } from "remotion";
import { BleUartCover } from "./BleUartCover";
import { BLE_UART_TOTAL_FRAMES, BleUartVideo } from "./BleUartVideo";
import { BLE_UART_FPS } from "./bleUartVoiceoverData";
import { Cover } from "./Cover";
import { IntroVideo, TOTAL_DURATION_FRAMES } from "./IntroVideo";
import { FPS } from "./voiceoverData";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Still
        id="Cover"
        component={Cover}
        width={1600}
        height={1200}
      />
      <Composition
        id="BleUartDemo"
        component={BleUartVideo}
        durationInFrames={BLE_UART_TOTAL_FRAMES}
        fps={BLE_UART_FPS}
        width={1920}
        height={1080}
      />
      <Still
        id="BleUartCover"
        component={BleUartCover}
        width={1600}
        height={1200}
      />
    </>
  );
};
