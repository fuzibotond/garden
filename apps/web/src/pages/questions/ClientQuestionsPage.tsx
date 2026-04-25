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
  answerClientQuestion,
  getClientJobTasks,
  getClientJobs,
  getTaskQuestions,
  type JobDto,
  type QuestionOptionDto,
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

function AnswerModal({
  question,
  onClose,
  onAnswered,
}: {
  question: TaskQuestionDto
  onClose: () => void
  onAnswered: (questionId: string) => void
}) {
  const token = getAccessToken()
  const [answerText, setAnswerText] = useState("")
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMultipleChoice = question.type === "MultipleChoice"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    const finalText = isMultipleChoice
      ? (question.options?.find((o) => o.optionId === selectedOptionId)?.text ?? answerText.trim())
      : answerText.trim()

    if (!finalText) {
      setError(
        isMultipleChoice ? "Please select an option or enter a custom answer." : "Please enter your answer.",
      )
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await answerClientQuestion(token, question.questionId, finalText)
      onAnswered(question.questionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <GlassCard
        variant="elevated"
        style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "rgba(255,255,255,0.9)" }}>
          Your Answer
        </h3>

        {/* Question preview */}
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
            {question.text}
          </p>
          {question.mediaUrls && question.mediaUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {question.mediaUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  <img
                    src={url}
                    alt={`Question media ${i + 1}`}
                    style={{
                      width: 90,
                      height: 72,
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
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          {isMultipleChoice && question.options ? (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Choose an answer *
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {question.options.map((opt: QuestionOptionDto) => (
                  <button
                    key={opt.optionId}
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(opt.optionId)
                      setAnswerText(opt.text)
                    }}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${
                        selectedOptionId === opt.optionId
                          ? "rgba(190,255,171,0.5)"
                          : "rgba(255,255,255,0.12)"
                      }`,
                      background:
                        selectedOptionId === opt.optionId
                          ? "rgba(190,255,171,0.08)"
                          : "rgba(255,255,255,0.03)",
                      color:
                        selectedOptionId === opt.optionId
                          ? "#d4ffb2"
                          : "rgba(255,255,255,0.75)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                Or type a custom answer (optional)
              </p>
              <GlassInput
                value={selectedOptionId ? "" : answerText}
                onChange={(e) => {
                  setSelectedOptionId(null)
                  setAnswerText(e.target.value)
                }}
                placeholder="Custom answer…"
                fullWidth
                style={{ marginBottom: 14 }}
              />
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Your answer *
              </p>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={4}
                placeholder="Type your answer…"
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
                  marginBottom: 14,
                }}
              />
            </>
          )}

          {error && (
            <p style={{ margin: "0 0 12px", color: "rgba(244,67,54,0.9)", fontSize: 13 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <GlassButton type="submit" loading={submitting}>
              {submitting ? "Submitting…" : "Submit Answer"}
            </GlassButton>
            <GlassButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: TaskQuestionDto
  onAnswer: (q: TaskQuestionDto) => void
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
        <span style={statusBadgeStyle(answered ? "Answered" : "Pending")}>
          {answered ? "Answered" : "Needs answer"}
        </span>
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
          {question.askedByName ? `From: ${question.askedByName}  ·  ` : ""}
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
            Your answer:
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

      {!answered && (
        <div style={{ marginTop: 12 }}>
          <GlassButton size="sm" onClick={() => onAnswer(question)}>
            Answer →
          </GlassButton>
        </div>
      )}
    </GlassCard>
  )
}

export default function ClientQuestionsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isClient = hasRole(user, "Client")

  const [jobs, setJobs] = useState<JobDto[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [questions, setQuestions] = useState<TaskQuestionDto[]>([])

  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [answeringQuestion, setAnsweringQuestion] = useState<TaskQuestionDto | null>(null)

  const loadJobs = useCallback(async () => {
    if (!token) return
    setLoadingJobs(true)
    try {
      const res = await getClientJobs(token, 1, 100)
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
      const res = await getClientJobTasks(token, selectedJobId, 1, 100)
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

  function handleAnswered(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, status: "Answered" as const }
          : q,
      ),
    )
    setAnsweringQuestion(null)
    // Reload to get the full answer data
    void loadQuestions()
  }

  if (!isClient) {
    return (
      <AdminLayout title="Unauthorized">
        <div style={{ padding: 24, color: "rgba(255,255,255,0.7)" }}>
          <p>Only clients can access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  const pending = questions.filter((q) => q.status === "Pending")
  const answered = questions.filter((q) => q.status === "Answered")

  return (
    <AdminLayout title="Questions from your Gardener">
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
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Job</p>
              <GlassSelect value={selectedJobId} onValueChange={(v) => setSelectedJobId(v)}>
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
          </div>

          {pending.length > 0 && selectedTaskId && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255, 193, 7, 0.1)",
                border: "1px solid rgba(255, 193, 7, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 13, color: "rgba(255, 193, 7, 0.9)" }}>
                {pending.length} question{pending.length !== 1 ? "s" : ""} awaiting your answer
              </span>
            </div>
          )}
        </GlassCard>

        {/* Questions list */}
        {!selectedTaskId ? (
          <GlassCard style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
              Select a job and task to view questions from your gardener.
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
                  Needs your answer ({pending.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {pending.map((q) => (
                    <QuestionCard
                      key={q.questionId}
                      question={q}
                      onAnswer={setAnsweringQuestion}
                    />
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
                    <QuestionCard
                      key={q.questionId}
                      question={q}
                      onAnswer={setAnsweringQuestion}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Answer modal */}
      {answeringQuestion && (
        <AnswerModal
          question={answeringQuestion}
          onClose={() => setAnsweringQuestion(null)}
          onAnswered={handleAnswered}
        />
      )}
    </AdminLayout>
  )
}
