import { useState } from "react";
import { LaneConfigCard } from "../components/LaneConfigCard";
import { Composer } from "../components/Composer";
import { MAX_LANES } from "../lib/stocks";
import { usePrefs, useSession } from "../store";
import { Button, Input, SectionIndex, Select, Spectrum, Wordmark } from "../ui";

export function ComposeScreen() {
  const prefs = usePrefs();
  const { providers, sendNew } = useSession();
  const [presetName, setPresetName] = useState("");

  return (
    <div className="mx-auto flex max-w-[1260px] flex-col gap-6 px-6 py-8">
      <header className="grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
        <h1 className="m-0">
          <Wordmark size={150} />
        </h1>
        <p className="m-0 max-w-[52ch] text-[16px] leading-normal text-graphite">
          One prompt, several models, read side by side. Every reply carries its own tokens in, cache, tokens out and
          cost, so you can see what each answer actually took.
        </p>
      </header>
      <Spectrum />

      <SectionIndex n="01" label="Compose" />
      <Composer lanes={prefs.lanes} onSend={(m) => void sendNew(m)} />

      <SectionIndex
        n="02"
        label={`Lanes · ${prefs.lanes.length}/${MAX_LANES}`}
        right={
          <span className="flex items-center gap-1 normal-case tracking-normal">
            {prefs.presets.length > 0 && (
              <Select
                aria-label="Load preset"
                className="!py-1 text-[12px]"
                value=""
                onChange={(e) => e.target.value && prefs.loadPreset(e.target.value)}
              >
                <option value="">load preset</option>
                {prefs.presets.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            <Input
              aria-label="Preset name"
              placeholder="preset name"
              className="!w-[160px] !py-1 text-[12px]"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button
              disabled={!presetName.trim()}
              onClick={() => {
                prefs.savePreset(presetName.trim());
                setPresetName("");
              }}
            >
              Save preset
            </Button>
            <Button onClick={prefs.resetDefaults}>Reset to defaults</Button>
          </span>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {prefs.lanes.map((lane) => (
          <LaneConfigCard
            key={lane.id}
            lane={lane}
            providers={providers}
            onChange={(patch) => prefs.setLane(lane.id, patch)}
            actions={
              <span className="flex gap-1 normal-case">
                <Button className="!px-1.5 !py-1" disabled={prefs.lanes.length >= MAX_LANES} onClick={() => prefs.duplicateLane(lane.id)}>
                  Duplicate lane
                </Button>
                {prefs.lanes.length > 1 && (
                  <Button variant="danger" className="!px-1.5 !py-1" onClick={() => prefs.removeLane(lane.id)}>
                    Remove
                  </Button>
                )}
              </span>
            }
          />
        ))}
        <div className="flex items-center justify-center border border-dashed border-ink p-4">
          <Button disabled={prefs.lanes.length >= MAX_LANES} onClick={prefs.addLane}>
            {prefs.lanes.length >= MAX_LANES ? "Max 4 lanes" : "+ Add lane"}
          </Button>
        </div>
      </div>
      <p className="fig">
        fig. 02 — with one lane, Send opens the compare view with an empty frame beside it: pick a second model there to
        replay the same prompt.
      </p>
    </div>
  );
}
