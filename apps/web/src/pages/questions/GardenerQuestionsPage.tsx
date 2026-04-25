import { useCallback, useEffect, useState } from "react"
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  createGardenerQuestion,
  getGardenerJobTasks,
  getGardenerJobs,
  getTaskQuestions,
  type CreateQuestionRequest,
  type JobDto,
  type QuestionType,
  type TaskDto,
  type TaskQuestionDto,
} from "../../services/apiClient"

function formatDateTime(value: string | undefined): string {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, string> = {
    Pending: "rgba(255, 193, 7, 0.2)",
    Answered: "rgba(76, 175, 80, 0.2)",
  }
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 6,
    background: colors[status] ?? colors.Pending,
    fontSize: 12,
    fontWeight: 500,
  }
}

function QuestionCard({
  question,
}: {
  question: TaskQuestionDto
}) {
  const answered = question.status === "Answered"

  return (
    <GlassCard
      style={{
        borderLeft: answered
          ? "3px solid rgba(76, 175, 80, 0.5)"
          : "3px solid rgba(255, 193, 7, 0.5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={statusBadgeStyle(question.status)}>{question.status}</span>
        {question.type === "MultipleChoice" && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(33, 150, 243, 0.18)",
              color: "rgba(147, 210, 255, 0.9)",
            }}
          >
            Multiple Choice
          </span>
        )}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>
          {formatDateTime(question.createdAt)}
        </span>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>
        {question.text}
      </p>

      {question.type === "MultipleChoice" && question.options && question.options.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {question.options.map((opt) => (
            <span
              key={opt.optionId}
              style={{
                fontSize: 12,
                padding: "3px 9px",
                borderRadius: 999,
                border: "1px solid rgba(190,255,171,0.2)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {opt.text}
            </span>
          ))}
        </div>
      )}

      {question.mediaUrls && question.mediaUrls.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {question.mediaUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
              <img
                src={url}
                alt={`Question media ${i + 1}`}
                style={{
                  width: 100,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            </a>
          ))}
        </div>
      )}

      {answered && question.answer && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(76, 175, 80, 0.08)",
            border: "1px solid rgba(76, 175, 80, 0.2)",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(76,175,80,0.8)", fontWeight: 600 }}>
            Client&apos;s answer
            {question.answer.answeredByName ? ` (${question.answer.answeredByName})` : ""}:
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
            {question.answer.text}
          </p>
          {question.answer.mediaUrls && question.answer.mediaUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {question.answer.mediaUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  <img
                    src={url}
                    alt={`Answer media ${i + 1}`}
                    style={{
                      width: 100,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid rgba(76,175,80,0.25)",
                      cursor: "pointer",
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </a>
              ))}
            </div>
          )}
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Answered {formatDateTime(question.answer.answeredAt)}
          </p>
        </div>
      )}
    </GlassCard>
  )
}

export default function GardenerQuestionsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isGardener = hasRole(user, "Gardener")

  const [jobs, setJobs] = useState<JobDto[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [questions, setQuestions] = useState<TaskQuestionDto[]>([])

  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create question form
  const [showCreate, setShowCreate] = useState(false)
  const [questionText, setQuestionText] = useState("")
  const [questionType, setQuestionType] = useState<QuestionType>("FreeText")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    if (!token) return
    setLoadingJobs(true)
    try {
      const res = await getGardenerJobs(token, 1, 100)
      const active = res.items.filter((j) => !j.isClosed)
      setJobs(active)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setLoadingJobs(false)
    }
  }, [token])

  const loadTasks = useCallback(async () => {
    if (!token || !selectedJobId) {
      setTasks([])
      setSelectedTaskId("")
      return
    }
    setLoadingTasks(true)
    try {
      const res = await getGardenerJobTasks(token, selectedJobId, 1, 100)
      setTasks(res.items)
      setSelectedTaskId("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoadingTasks(false)
    }
  }, [token, selectedJobId])

  const loadQuestions = useCallback(async () => {
    if (!token || !selectedTaskId) {
      setQuestions([])
      return
    }
    setLoadingQuestions(true)
    setError(null)
    try {
      const res = await getTaskQuestions(token, selectedTaskId)
      setQuestions(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions")
    } finally {
      setLoadingQuestions(false)
    }
  }, [token, selectedTaskId])

  useEffect(() => { void loadJobs() }, [loadJobs])
  useEffect(() => { void loadTasks() }, [loadTasks])
  useEffect(() => { void loadQuestions() }, [loadQuestions])

  function resetCreateForm() {
    setQuestionText("")
    setQuestionType("FreeText")
    setOptions(["", ""])
    setCreateError(null)
  }

  function openCreate() {
    resetCreateForm()
    setShowCreate(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !selectedTaskId) return

    if (!questionText.trim()) {
      setCreateError("Please enter the question text.")
      return
    }

    if (questionType === "MultipleChoice") {
      const valid = options.filter((o) => o.trim())
      if (valid.length < 2) {
        setCreateError("Please add at least 2 answer options.")
        return
      }
    }

    setCreating(true)
    setCreateError(null)
    try {
      const body: CreateQuestionRequest = {
        text: questionText.trim(),
        type: questionType,
        options:
          questionType === "MultipleChoice"
            ? options.filter((o) => o.trim())
            : undefined,
      }
      const created = await createGardenerQuestion(token, selectedTaskId, body)
      setQuestions((prev) => [created, ...prev])
      setShowCreate(false)
      resetCreateForm()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create question")
    } finally {
      setCreating(false)
    }
  }

  if (!isGardener) {
    return (
      <AdminLayout title="Unauthorized">
        <div style={{ padding: 24, color: "rgba(255,255,255,0.7)" }}>
          <p>Only gardeners can access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  const pending = questions.filter((q) => q.status === "Pending")
  const answered = questions.filter((q) => q.status === "Answered")

  return (
    <AdminLayout title="Task Questions">
      <div style={{ padding: 24, maxWidth: 860 }}>
        {error && (
          <GlassCard
            style={{
              padding: 14,
              marginBottom: 20,
              borderLeft: "3px solid rgba(244, 67, 54, 0.6)",
              background: "rgba(244, 67, 54, 0.08)",
            }}
          >
            <p style={{ margin: 0, color: "rgba(244, 67, 54, 0.9)", fontSize: 13 }}>{error}</p>
          </GlassCard>
        )}

        {/* Selectors */}
        <GlassCard style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Job</p>
              <GlassSelect
                value={selectedJobId}
                onValueChange={(v) => setSelectedJobId(v)}
              >
                <GlassSelectTrigger>
                  <GlassSelectValue placeholder={loadingJobs ? "Loading…" : "Select a job"} />
                </GlassSelectTrigger>
                <GlassSelectContent>
                  {jobs.map((j) => (
                    <GlassSelectItem key={j.jobId} value={j.jobId}>
                      {j.name}
                    </GlassSelectItem>
                  ))}
                </GlassSelectContent>
              </GlassSelect>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Task</p>
              <GlassSelect
                value={selectedTaskId}
                onValueChange={(v) => setSelectedTaskId(v)}
                disabled={!selectedJobId || loadingTasks}
              >
                <GlassSelectTrigger>
                  <GlassSelectValue
                    placeholder={
                      !selectedJobId
                        ? "Select a job first"
                        : loadingTasks
                        ? "Loading…"
                        : tasks.length === 0
                        ? "No tasks"
                        : "Select a task"
                    }
                  />
                </GlassSelectTrigger>
                <GlassSelectContent>
                  {tasks.map((t) => (
                    <GlassSelectItem key={t.taskId} value={t.taskId}>
                      {t.name}
                    </GlassSelectItem>
                  ))}
                </GlassSelectContent>
              </GlassSelect>
            </div>

            {selectedTaskId && (
              <GlassButton
                onClick={openCreate}
                style={{ alignSelf: "flex-end" }}
              >
                + Ask Question
              </GlassButton>
            )}
          </div>
        </GlassCard>

        {/* Create question form */}
        {showCreate && (
          <GlassCard variant="outlined" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "rgba(255,255,255,0.9)" }}>
              New Question
            </h3>
            <form onSubmit={(e) => void handleCreate(e)}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  Question text *
                </p>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  placeholder="What would you like to ask the client?"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(190,255,171,0.25)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: 14,
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  Question type
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["FreeText", "MultipleChoice"] as QuestionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuestionType(t)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: `1px solid ${
                          questionType === t
                            ? "rgba(190,255,171,0.5)"
                            : "rgba(255,255,255,0.15)"
                        }`,
                        background:
                          questionType === t
                            ? "rgba(190,255,171,0.12)"
                            : "transparent",
                        color: questionType === t ? "#d4ffb2" : "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {t === "FreeText" ? "Free text" : "Multiple choice"}
                    </button>
                  ))}
                </div>
              </div>

              {questionType === "MultipleChoice" && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    Options (minimum 2)
                  </p>
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <GlassInput
                        value={opt}
                        onChange={(e) => {
                          const next = [...options]
                          next[i] = e.target.value
                          setOptions(next)
                        }}
                        placeholder={`Option ${i + 1}`}
                        style={{ flex: 1 }}
                      />
                      {options.length > 2 && (
                        <GlassButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          ✕
                        </GlassButton>
                      )}
                    </div>
                  ))}
                  <GlassButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOptions((prev) => [...prev, ""])}
                  >
                    + Add option
                  </GlassButton>
                </div>
              )}

              {createError && (
                <p style={{ margin: "0 0 12px", color: "rgba(244,67,54,0.9)", fontSize: 13 }}>
                  {createError}
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <GlassButton type="submit" loading={creating}>
                  {creating ? "Sending…" : "Send Question"}
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Questions list */}
        {!selectedTaskId ? (
          <GlassCard style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
              Select a job and task to view its questions.
            </p>
          </GlassCard>
        ) : loadingQuestions ? (
          <GlassCard style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
              Loading questions…
            </p>
          </GlassCard>
        ) : questions.length === 0 ? (
          <GlassCard style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
              No questions for this task yet.
            </p>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Click &quot;+ Ask Question&quot; to send a question to your client.
            </p>
          </GlassCard>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Awaiting answer ({pending.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {pending.map((q) => (
                    <QuestionCard key={q.questionId} question={q} />
                  ))}
                </div>
              </>
            )}

            {answered.length > 0 && (
              <>
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Answered ({answered.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {answered.map((q) => (
                    <QuestionCard key={q.questionId} question={q} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
