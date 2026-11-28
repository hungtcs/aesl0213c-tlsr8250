import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Hardware } from "./scenes/Scene2Hardware";
import { Scene3Reverse } from "./scenes/Scene3Reverse";
import { Scene4Flash } from "./scenes/Scene4Flash";
import { Scene5EpdPwa } from "./scenes/Scene5EpdPwa";
import { Scene6BleUart } from "./scenes/Scene6BleUart";
import { Scene7FindMy } from "./scenes/Scene7FindMy";
import { Scene8DevOutro } from "./scenes/Scene8DevOutro";
import { VOICEOVER_DATA } from "./voiceoverData";

export const TRANSITION_FRAMES = 12;

const SCENE_LIST = [
  { id: "scene1_intro", Component: Scene1Intro },
  { id: "scene2_hardware", Component: Scene2Hardware },
  { id: "scene3_reverse", Component: Scene3Reverse },
  { id: "scene4_flash", Component: Scene4Flash },
  { id: "scene5_epd_pwa", Component: Scene5EpdPwa },
  { id: "scene6_ble_uart", Component: Scene6BleUart },
  { id: "scene7_findmy", Component: Scene7FindMy },
  { id: "scene8_dev_outro", Component: Scene8DevOutro },
] as const;

export const TOTAL_DURATION_FRAMES =
  SCENE_LIST.reduce(
    (sum, s) => sum + VOICEOVER_DATA[s.id].durationInFrames,
    0
  ) -
  (SCENE_LIST.length - 1) * TRANSITION_FRAMES;

export const IntroVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {SCENE_LIST.map(({ id, Component }, idx) => (
        <React.Fragment key={id}>
          <TransitionSeries.Sequence
            durationInFrames={VOICEOVER_DATA[id].durationInFrames}
          >
            <Component />
          </TransitionSeries.Sequence>
          {idx < SCENE_LIST.length - 1 && (
            <TransitionSeries.Transition
              presentation={
                idx % 2 === 0
                  ? fade()
                  : slide({ direction: "from-right" })
              }
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
