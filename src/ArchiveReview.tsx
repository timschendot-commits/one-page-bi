import { useState, useEffect } from "react";
import { call } from "./bridge";
import { Modal } from "./Modal";
import { replay, type SavedRun } from "./replay";
import { useLanguage } from "./language";
import { errorText } from "./i18n";
import { parse } from "csv-parse/browser/esm/sync";
export function ArchiveReview({
  id,
  close,
}: {
  id: string;
  close: () => void;
}) {
  const { t, language } = useLanguage(),
    [info, setInfo] = useState<{ config: SavedRun; expected: string }>(),
    [index, setIndex] = useState(0),
    [full, setFull] = useState(false),
    [csv, setCsv] = useState(""),
    [page, setPage] = useState(0),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const part = (index: number, original: boolean, all = false) =>
    call<{ csv: string; bytes: string; staged: string }>("reviewPart", {
      archiveId: id,
      index,
      original,
      full: all,
    });
  useEffect(() => {
    let live = true;
    call<{ template: string; processed: string }>("review", {
      archiveId: id,
    }).then(
      (x) => {
        if (live)
          setInfo({ config: JSON.parse(x.template), expected: x.processed });
      },
      (e) => {
        if (live) setStatus(errorText(e, language));
      },
    );
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    if (!info) return;
    let live = true;
    setPage(0);
    setCsv("");
    part(index, false, full).then(
      (x) => {
        if (live) setCsv(x.csv);
      },
      (e) => {
        if (live) setStatus(errorText(e, language));
      },
    );
    return () => {
      live = false;
    };
  }, [info, index, full]);
  const all = csv ? (parse(csv, { skip_empty_lines: true }) as string[][]) : [];
  const pages = Math.max(1, Math.ceil((all.length - 1) / 10));
  const preview = all.length
    ? [all[0], ...all.slice(1 + page * 10, 11 + page * 10)]
    : [];
  return (
    <Modal title={t("Checked materials")} onClose={close}>
      {info && (
        <>
          <select
            aria-label={t("Source")}
            value={index}
            onChange={(e) => setIndex(+e.target.value)}
          >
            {info.config.sources.map((s, i) => (
              <option value={i} key={i}>
                {s.name} / {s.sheet}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={full}
              onChange={(e) => setFull(e.target.checked)}
            />
            {t("Show all staged columns")}
          </label>
          <p>
            {t("Header row")} · {info.config.sources[index].headerRow} · SHA-256{" "}
            <code>{info.config.sources[index].sha256.slice(0, 16)}…</code>
          </p>
          <div className="sample-scroll">
            <table>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              {t("Previous rows")}
            </button>{" "}
            {page + 1}/{pages}{" "}
            <button
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
            >
              {t("Next rows")}
            </button>
          </div>
          <button
            disabled={!csv || busy}
            onClick={async () => {
              try {
                if (await call("saveMaterial", { csv }))
                  setStatus(t("Exported material"));
              } catch (e) {
                setStatus(errorText(e, language));
              }
            }}
          >
            {t("Save a copy")}
          </button>
          <button
            disabled={busy || !csv}
            onClick={async () => {
              setBusy(true);
              setStatus("…");
              try {
                await replay(info.config, info.expected, (i) => part(i, true));
                setStatus(t("Verification passed"));
              } catch (e) {
                setStatus(
                  t("Verification failed") + " · " + errorText(e, language),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Run verification")}
          </button>
        </>
      )}
      <p role="status">{status}</p>
    </Modal>
  );
}
