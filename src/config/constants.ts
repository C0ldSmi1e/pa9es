export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const content = {
  maxHtmlBytes: 1024 * 1024,
};

export const credits = {
  scale: 1,
  signupBonus: 500,
  publishCost: 100,
};

export const referrals = {
  refereeBonus: 500,
  referrerBonus: 500,
  maxRewards: 20,
};

export const ai = {
  // Per-feature model choice is config, not code (docs/ai-features.md).
  models: {
    commitMessage: "claude-opus-5",
    edit: "claude-opus-5",
  },
  edit: {
    maxInstructionChars: 2000,
    // An edit sends the whole draft and regenerates it — cap what we ask
    // the model to rewrite (well under content.maxHtmlBytes).
    maxDraftBytes: 256 * 1024,
  },
  // Per user, per action. The only usage guard while AI is free.
  rateLimit: {
    windowSec: 60,
    maxRequests: 10,
  },
};
