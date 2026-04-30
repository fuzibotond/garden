import { Box, Container, Flex, Grid, Section, Text } from "@radix-ui/themes"
import { Link } from "react-router-dom"
import { GlassButton, GlassCard } from "../../components/ui/GlassUI"

const features = [
  {
    icon: "🌿",
    title: "Job Management",
    description:
      "Organise gardening jobs by client. Assign team members, track progress, and keep everything in one place.",
  },
  {
    icon: "📋",
    title: "Task Tracking",
    description:
      "Break jobs into tasks, estimate time, log materials used, and calculate costs automatically.",
  },
  {
    icon: "📦",
    title: "Materials Inventory",
    description:
      "Manage your stock, set prices per unit, and see real-time material costs linked to every task.",
  },
  {
    icon: "👥",
    title: "Client Portal",
    description:
      "Invite clients to view their schedules and job updates. No more back-and-forth messaging.",
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    description:
      "Visual calendar for gardeners and clients alike. Plan the week at a glance, never double-book.",
  },
  {
    icon: "🔐",
    title: "Role-based Access",
    description:
      "Admin, Gardener, and Client roles with granular permissions. Each user sees exactly what they need.",
  },
]

const steps = [
  {
    number: "01",
    title: "Register your company",
    description: "Create a Gardener account in minutes. No credit card required.",
  },
  {
    number: "02",
    title: "Add clients & invite them",
    description: "Enter client details or send an email invitation. They join with one click.",
  },
  {
    number: "03",
    title: "Create jobs and tasks",
    description: "Build jobs for each client, add tasks with time estimates and materials.",
  },
  {
    number: "04",
    title: "Track, complete, grow",
    description: "Log actual time and costs, mark tasks done, and watch your business thrive.",
  },
]

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(119,199,92,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(73,169,90,0.3), transparent 60%), linear-gradient(160deg,#08140b 0%,#050a06 40%,#020402 100%)",
      }}
    >
      {/* ── Navbar ── */}
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px) saturate(150%)",
          WebkitBackdropFilter: "blur(20px) saturate(150%)",
          background: "rgba(7,20,12,0.75)",
        }}
      >
        <Container size="4" px="5">
          <Flex align="center" justify="between" py="4">
            <Text
              size="4"
              weight="bold"
              style={{
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#d9ff6a",
              }}
            >
              🌱 Garden
            </Text>

            <Flex gap="3" align="center">
              <Link to="/login">
                <GlassButton variant="ghost" size="sm">
                  Sign In
                </GlassButton>
              </Link>
              <Link to="/signup">
                <GlassButton variant="primary" size="sm">
                  Get Started
                </GlassButton>
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* ── Hero ── */}
      <Section size="3" pt="9" pb="8">
        <Container size="3" px="5">
          <Flex direction="column" align="center" gap="5" style={{ textAlign: "center" }}>
            <span className="pill">
              <span className="pill-dot" />
              <span>Built for professional gardeners</span>
            </span>

            <Text
              as="div"
              style={{
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#f7f8f4",
              }}
            >
              Run your garden business{" "}
              <span style={{ color: "#d9ff6a" }}>beautifully</span>
            </Text>

            <Text
              size="4"
              style={{ maxWidth: 520, color: "var(--text-muted)", lineHeight: 1.7 }}
            >
              Garden Admin brings jobs, tasks, clients, and materials into one lush
              dashboard — so you spend less time on paperwork and more time outdoors.
            </Text>

            <Flex gap="3" wrap="wrap" justify="center">
              <Link to="/signup">
                <GlassButton variant="primary" size="lg">
                  Start for free
                </GlassButton>
              </Link>
              <Link to="/login">
                <GlassButton variant="secondary" size="lg">
                  Sign in
                </GlassButton>
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Section>

      {/* ── Stats strip ── */}
      <Container size="4" px="5" pb="8">
        <GlassCard variant="elevated" padding="lg">
          <Grid columns={{ initial: "1", sm: "3" }} gap="6">
            {[
              { value: "500+", label: "Gardening businesses" },
              { value: "12k+", label: "Jobs completed" },
              { value: "98%", label: "Client satisfaction" },
            ].map((stat) => (
              <Flex key={stat.label} direction="column" align="center" gap="1">
                <Text
                  size="8"
                  weight="bold"
                  style={{ color: "#d9ff6a", letterSpacing: "-0.02em" }}
                >
                  {stat.value}
                </Text>
                <Text size="2" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </Text>
              </Flex>
            ))}
          </Grid>
        </GlassCard>
      </Container>

      {/* ── Features ── */}
      <Section size="3" pb="8">
        <Container size="4" px="5">
          <Flex direction="column" gap="7">
            <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
              <Text size="2" style={{ color: "#d9ff6a", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Everything you need
              </Text>
              <Text
                as="div"
                size="7"
                weight="bold"
                style={{ color: "#f7f8f4", letterSpacing: "-0.01em" }}
              >
                All your tools, one place
              </Text>
              <Text size="3" style={{ maxWidth: 440, color: "var(--text-muted)" }}>
                From first quote to final invoice, Garden Admin handles every step of your workflow.
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
              {features.map((f) => (
                <GlassCard key={f.title} variant="glow" padding="lg">
                  <Flex direction="column" gap="3">
                    <Text size="6" style={{ lineHeight: 1 }}>{f.icon}</Text>
                    <Text size="4" weight="bold" style={{ color: "#f7f8f4" }}>
                      {f.title}
                    </Text>
                    <Text size="2" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {f.description}
                    </Text>
                  </Flex>
                </GlassCard>
              ))}
            </Grid>
          </Flex>
        </Container>
      </Section>

      {/* ── How it works ── */}
      <Section size="3" pb="8">
        <Container size="4" px="5">
          <Flex direction="column" gap="7">
            <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
              <Text size="2" style={{ color: "#d9ff6a", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Get started in minutes
              </Text>
              <Text
                as="div"
                size="7"
                weight="bold"
                style={{ color: "#f7f8f4", letterSpacing: "-0.01em" }}
              >
                How it works
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="4">
              {steps.map((step) => (
                <GlassCard key={step.number} variant="outlined" padding="lg">
                  <Flex direction="column" gap="3">
                    <Text
                      size="6"
                      weight="bold"
                      style={{ color: "#d9ff6a", fontVariantNumeric: "tabular-nums" }}
                    >
                      {step.number}
                    </Text>
                    <Text size="3" weight="bold" style={{ color: "#f7f8f4" }}>
                      {step.title}
                    </Text>
                    <Text size="2" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {step.description}
                    </Text>
                  </Flex>
                </GlassCard>
              ))}
            </Grid>
          </Flex>
        </Container>
      </Section>

      {/* ── CTA banner ── */}
      <Section size="2" pb="9">
        <Container size="3" px="5">
          <GlassCard
            variant="glow"
            padding="xl"
            style={{ textAlign: "center" }}
          >
            <Flex direction="column" align="center" gap="5">
              <Text
                as="div"
                size="7"
                weight="bold"
                style={{ color: "#f7f8f4", letterSpacing: "-0.01em" }}
              >
                Ready to grow your business?
              </Text>
              <Text size="3" style={{ maxWidth: 400, color: "var(--text-muted)" }}>
                Join hundreds of gardening professionals already using Garden Admin.
              </Text>
              <Flex gap="3" wrap="wrap" justify="center">
                <Link to="/signup">
                  <GlassButton variant="primary" size="xl">
                    Create free account
                  </GlassButton>
                </Link>
                <Link to="/login">
                  <GlassButton variant="ghost" size="xl">
                    Sign in
                  </GlassButton>
                </Link>
              </Flex>
            </Flex>
          </GlassCard>
        </Container>
      </Section>

      {/* ── Footer ── */}
      <Box
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "28px 0",
        }}
      >
        <Container size="4" px="5">
          <Flex align="center" justify="between" wrap="wrap" gap="4">
            <Text
              size="3"
              weight="bold"
              style={{
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#d9ff6a",
              }}
            >
              🌱 Garden
            </Text>
            <Text size="1" style={{ color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} Garden Admin. Built for those who get their hands dirty.
            </Text>
            <Flex gap="4">
              <Link to="/login" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Sign In
              </Link>
              <Link to="/signup" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Sign Up
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </div>
  )
}
