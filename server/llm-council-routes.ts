import { Router, type RequestHandler } from "express";
import { callLLM } from "./llm-router";

const router = Router();

const ADVISORS = [
  {
    name: "The Contrarian",
    description:
      "You actively look for what's wrong, what's missing, what will fail. You assume the idea has a fatal flaw and try to find it. If everything looks solid, dig deeper. You are not a pessimist — you're the friend who saves someone from a bad deal by asking the questions they're avoiding.",
  },
  {
    name: "The First Principles Thinker",
    description:
      "You ignore the surface-level question and ask 'what are we actually trying to solve here?' You strip away assumptions and rebuild the problem from the ground up. Sometimes the most valuable thing you can do is say 'you're asking the wrong question entirely.'",
  },
  {
    name: "The Expansionist",
    description:
      "You look for upside everyone else is missing. What could be bigger? What adjacent opportunity is hiding? What's being undervalued? You don't care about risk — that's the Contrarian's job. You care about what happens if this works even better than expected.",
  },
  {
    name: "The Outsider",
    description:
      "You have zero context about the user's field or history. You respond purely to what's in front of you. You catch the curse of knowledge: things that are obvious to insiders but confusing to everyone else. You represent fresh eyes with no assumptions.",
  },
  {
    name: "The Executor",
    description:
      "You only care about one thing: can this actually be done, and what's the fastest path to doing it? You ignore theory, strategy, and big-picture thinking. You look at every idea through the lens of 'OK but what do you do Monday morning?' If an idea sounds brilliant but has no clear first step, you say so.",
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const runCouncil: RequestHandler = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string" || question.trim().length < 10) {
      return res.status(400).json({ message: "A meaningful question is required (min 10 characters)." });
    }

    const framedQuestion = question.trim();

    // Step 2: All 5 advisors in parallel
    const advisorResponses = await Promise.all(
      ADVISORS.map((advisor) =>
        callLLM({
          system: `You are ${advisor.name} on an LLM Council.\n\nYour thinking style: ${advisor.description}\n\nRespond from your perspective only. Be direct and specific. Do not hedge or try to be balanced — lean fully into your assigned angle. The other advisors will cover angles you're not covering.\n\nKeep your response between 150 and 300 words. No preamble. Go straight into your analysis.`,
          userMessage: `A user has brought this question to the council:\n\n${framedQuestion}`,
          maxTokens: 700,
        })
      )
    );

    const advisorResults = ADVISORS.map((a, i) => ({
      name: a.name,
      response: advisorResponses[i].text,
    }));

    // Step 3: Anonymize and peer review
    const letters = ["A", "B", "C", "D", "E"];
    const shuffledIndices = shuffleArray([0, 1, 2, 3, 4]);
    const anonymized = shuffledIndices.map((advisorIdx, letterIdx) => ({
      letter: letters[letterIdx],
      advisorIndex: advisorIdx,
      response: advisorResults[advisorIdx].response,
    }));

    const anonymizedText = anonymized
      .map((a) => `Response ${a.letter}:\n${a.response}`)
      .join("\n\n");

    const reviewerSystem = `You are reviewing the outputs of an LLM Council session. Five advisors independently answered the question below. Answer exactly these three questions. Be specific — reference responses by letter.\n\n1. Which response is the strongest, and why?\n2. Which response has the biggest blind spot, and what is it missing?\n3. What did ALL five responses miss that the council should consider?\n\nKeep your review under 200 words. Be direct.`;

    const reviewerUserMessage = `The question brought to the council:\n\n${framedQuestion}\n\nHere are the anonymized advisor responses:\n\n${anonymizedText}`;

    const peerReviews = await Promise.all(
      Array(5)
        .fill(null)
        .map(() =>
          callLLM({
            system: reviewerSystem,
            userMessage: reviewerUserMessage,
            maxTokens: 500,
          })
        )
    );

    const peerReviewTexts = peerReviews.map((r) => r.text);

    // Build de-anonymization map for chairman context
    const deanonMap = anonymized
      .map((a) => `Response ${a.letter} = ${advisorResults[a.advisorIndex].name}`)
      .join(", ");

    // Step 4: Chairman synthesis
    const advisorBlock = advisorResults.map((a) => `${a.name}:\n${a.response}`).join("\n\n");
    const reviewBlock = peerReviewTexts.map((r, i) => `Peer Review ${i + 1}:\n${r}`).join("\n\n");

    const chairmanResult = await callLLM({
      system: `You are the Chairman of an LLM Council. Your job is to synthesize the work of 5 advisors and their peer reviews into a final verdict.

Produce the council verdict using this EXACT structure with these exact markdown headings:

## Where the Council Agrees
Points that multiple advisors converged on independently. These are high-confidence signals.

## Where the Council Clashes
Genuine disagreements between advisors. Present both sides and explain why reasonable advisors disagree. Do not smooth these over.

## Blind Spots the Council Caught
Things that only emerged through the peer review round. Things individual advisors missed that reviewers flagged.

## The Recommendation
A clear, direct recommendation. Not "it depends." A real answer with reasoning. The chairman can disagree with the majority if the logic supports it.

## The One Thing to Do First
A single concrete next step. Not a list. One thing only.

Be direct. Don't hedge. The entire point of the council is to give the user clarity they couldn't get from a single perspective.`,
      userMessage: `The question brought to the council:\n\n${framedQuestion}\n\nADVISOR RESPONSES:\n\n${advisorBlock}\n\nPEER REVIEWS (responses were anonymized as ${deanonMap}):\n\n${reviewBlock}`,
      maxTokens: 1800,
    });

    res.json({
      question: framedQuestion,
      advisors: advisorResults,
      peerReviews: peerReviewTexts,
      chairman: chairmanResult.text,
      anonymizationMap: deanonMap,
    });
  } catch (error: any) {
    console.error("[LLM-Council] Error:", error);
    res.status(500).json({ message: error.message || "Council session failed." });
  }
};

router.post("/run", runCouncil);

export default router;
