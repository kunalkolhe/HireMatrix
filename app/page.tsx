"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { ArrowDown, ArrowRight, Check, Zap } from "lucide-react"

export default function LandingPage() {
  const [showNav, setShowNav] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()

  // Show nav after first section
  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > window.innerHeight * 0.5)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="dark bg-background text-foreground overflow-x-hidden min-h-screen">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-primary origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Floating Nav - appears after scroll */}
      <AnimatePresence>
        {showNav && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
          >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-semibold tracking-tight">HireMatrix</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/signup">
                  <button className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:brightness-110 transition-colors">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          ACT 1: THE HOOK
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-[90px] font-light text-center leading-tight tracking-tight"
        >
          Hiring is <span className="text-foreground">broken</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 text-lg text-muted-foreground/70 text-center max-w-xl"
        >
          Resumes lie. Interviews are biased. You're guessing.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-12 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground/70 uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowDown className="w-5 h-5 text-muted-foreground/70" />
          </motion.div>
        </motion.div>

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ACT 2: THE PROBLEM
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center py-32 px-6 relative">
        <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <span className="text-[120px] md:text-[180px] font-bold text-foreground leading-none">72%</span>
              <p className="text-xl md:text-2xl text-muted-foreground mt-4">of job applications contain exaggerated claims</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {[
                { stat: "85%", text: "of hiring managers have caught lies on resumes" },
                { stat: "40%", text: "of new hires are considered bad hires within 18 months" },
                { stat: "$17K", text: "average cost of one bad hire" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  viewport={{ once: true }}
                  className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="text-4xl font-semibold text-foreground mb-3">{item.stat}</div>
                  <div className="text-sm text-muted-foreground/70">{item.text}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ACT 3: THE TURN
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="text-center relative z-10"
        >
          <p className="text-lg md:text-xl text-muted-foreground/70 mb-6">What if you could</p>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight">
            actually <span className="italic text-foreground">know</span>?
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            viewport={{ once: true }}
            className="mt-16 flex items-center justify-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">HireMatrix</span>
          </motion.div>
        </motion.div>

        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-gradient-radial from-[#E8C547]/10 via-transparent to-transparent opacity-50" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ACT 4: THE PROOF (Features)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-light mb-4">How it works</h2>
            <p className="text-muted-foreground/70">Three simple steps to better hiring</p>
          </motion.div>

          <div className="space-y-32">
            {/* Feature 1 */}
            <FeatureBlock
              number="01"
              title="Paste your job description"
              description="Our AI understands what skills matter. Technical requirements, soft skills, experience level — all extracted automatically."
              visual={
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="font-mono text-sm text-muted-foreground space-y-2"
                  >
                    <TypewriterText text="Analyzing job description..." delay={0} />
                    <TypewriterText text="✓ Found: React, Node.js, TypeScript" delay={1} />
                    <TypewriterText text="✓ Level: Senior (5+ years)" delay={2} />
                    <TypewriterText text="✓ Generating assessment..." delay={3} />
                  </motion.div>
                </div>
              }
            />

            {/* Feature 2 */}
            <FeatureBlock
              number="02"
              title="Candidates take real assessments"
              description="MCQs, coding challenges, and scenario-based questions. All generated specifically for the role. No more generic tests."
              visual={
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="space-y-4">
                    {["Multiple Choice", "Coding Challenge", "Scenario Analysis"].map((type, i) => (
                      <motion.div
                        key={type}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.2 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-foreground">
                          {i + 1}
                        </div>
                        <span className="text-muted-foreground">{type}</span>
                        <div className="ml-auto">
                          <Check className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              }
              reverse
            />

            {/* Feature 3 */}
            <FeatureBlock
              number="03"
              title="Get verified results"
              description="See who actually has the skills. Anti-fraud detection, plagiarism checks, and detailed analytics. Hire with confidence."
              visual={
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="flex items-end gap-4 h-40">
                    {[85, 72, 90, 65, 78].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className="flex-1 bg-gradient-to-t from-[#E8C547] to-[#E8C547]/50 rounded-t-lg"
                      />
                    ))}
                  </div>
                  <div className="mt-4 text-center text-sm text-muted-foreground/70">Candidate Performance</div>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ACT 5: THE CALL
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center py-32 px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-light mb-6 tracking-tight">
            Ready to hire with <span className="text-foreground">certainty</span>?
          </h2>
          <p className="text-lg text-muted-foreground/70 mb-12">
            Join companies who've stopped guessing and started knowing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-full hover:brightness-110 transition-colors flex items-center gap-2"
              >
                Start Free <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link href="/login">
              <button className="px-10 py-4 text-muted-foreground hover:text-foreground text-lg transition-colors">
                Sign in
              </button>
            </Link>
          </div>

          <p className="mt-8 text-sm text-muted-foreground/70">No credit card required</p>
        </motion.div>

        {/* Ambient glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="py-16 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-semibold">HireMatrix</span>
            </div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground/70">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground/70">
            © 2026 HireMatrix. Built for better hiring.
          </div>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8 }}
    >
      {children}
    </motion.div>
  )
}

function FeatureBlock({
  number,
  title,
  description,
  visual,
  reverse = false
}: {
  number: string
  title: string
  description: string
  visual: React.ReactNode
  reverse?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: "-100px" }}
      className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? "md:flex-row-reverse" : ""}`}
    >
      <div className={reverse ? "md:order-2" : ""}>
        <span className="text-primary/50 text-sm font-mono mb-4 block">{number}</span>
        <h3 className="text-3xl font-light mb-4">{title}</h3>
        <p className="text-muted-foreground/70 text-lg leading-relaxed">{description}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        {visual}
      </div>
    </motion.div>
  )
}

function TypewriterText({ text, delay }: { text: string; delay: number }) {
  const [displayText, setDisplayText] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const timer = setTimeout(() => {
      setIsVisible(true)
      let i = 0
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayText(text.slice(0, i))
          i++
        } else {
          clearInterval(interval)
        }
      }, 30)
      return () => clearInterval(interval)
    }, delay * 1000)

    return () => clearTimeout(timer)
  }, [isInView, text, delay])

  return (
    <div ref={ref} className="h-6">
      {isVisible && (
        <span>
          {displayText}
          <span className="animate-pulse">|</span>
        </span>
      )}
    </div>
  )
}
