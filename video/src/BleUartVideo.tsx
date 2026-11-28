import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { BLE_UART_VOICEOVER } from "./bleUartVoiceoverData";
import { B1Intro } from "./ble_uart/B1Intro";
import { B2Flash } from "./ble_uart/B2Flash";
import { B2Wiring } from "./ble_uart/B2Wiring";
import { B3Console } from "./ble_uart/B3Console";
import { B4Mobile } from "./ble_uart/B4Mobile";
import { B5AtMode } from "./ble_uart/B5AtMode";
import { B6AtConfig } from "./ble_uart/B6AtConfig";
import { B7Ota } from "./ble_uart/B7Ota";
import { B8Outro } from "./ble_uart/B8Outro";

export const BLE_UART_TRANSITION_FRAMES = 12;

const SCENES = [
  { id: "b1_intro", Component: B1Intro },
  { id: "b2_flash", Component: B2Flash },
  { id: "b2_wiring", Component: B2Wiring },
  { id: "b3_console", Component: B3Console },
  { id: "b4_mobile", Component: B4Mobile },
  { id: "b5_at_mode", Component: B5AtMode },
  { id: "b6_at_config", Component: B6AtConfig },
  { id: "b7_ota", Component: B7Ota },
  { id: "b8_outro", Component: B8Outro },
] as const;

export const BLE_UART_TOTAL_FRAMES =
  SCENES.reduce((sum, s) => sum + BLE_UART_VOICEOVER[s.id].durationInFrames, 0) -
  (SCENES.length - 1) * BLE_UART_TRANSITION_FRAMES;

export const BleUartVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {SCENES.map(({ id, Component }, idx) => (
        <React.Fragment key={id}>
          <TransitionSeries.Sequence
            durationInFrames={BLE_UART_VOICEOVER[id].durationInFrames}
          >
            <Component />
          </TransitionSeries.Sequence>
          {idx < SCENES.length - 1 && (
            <TransitionSeries.Transition
              presentation={
                idx % 2 === 0 ? fade() : slide({ direction: "from-right" })
              }
              timing={linearTiming({ durationInFrames: BLE_UART_TRANSITION_FRAMES })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
