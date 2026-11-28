// Campaign driver attributes v1. IDs/identity/assignments remain in CampaignConfig.
(()=>{
  "use strict";
  const profiles = {
  "d001": {
    "qualifyingPace": 86,
    "racePace": 85,
    "consistency": 92,
    "racecraft": 46,
    "aggression": 47,
    "defensiveSkill": 51,
    "precision": 89,
    "adaptability": 79,
    "potential": 96
  },
  "d002": {
    "qualifyingPace": 81,
    "racePace": 88,
    "consistency": 85,
    "racecraft": 94,
    "aggression": 43,
    "defensiveSkill": 39,
    "precision": 88,
    "adaptability": 77,
    "potential": 89
  },
  "d003": {
    "qualifyingPace": 86,
    "racePace": 79,
    "consistency": 82,
    "racecraft": 92,
    "aggression": 39,
    "defensiveSkill": 88,
    "precision": 76,
    "adaptability": 76,
    "potential": 93
  },
  "d004": {
    "qualifyingPace": 95,
    "racePace": 88,
    "consistency": 86,
    "racecraft": 58,
    "aggression": 68,
    "defensiveSkill": 50,
    "precision": 82,
    "adaptability": 87,
    "potential": 95
  },
  "d005": {
    "qualifyingPace": 77,
    "racePace": 94,
    "consistency": 83,
    "racecraft": 56,
    "aggression": 64,
    "defensiveSkill": 38,
    "precision": 85,
    "adaptability": 85,
    "potential": 92
  },
  "d006": {
    "qualifyingPace": 89,
    "racePace": 91,
    "consistency": 87,
    "racecraft": 53,
    "aggression": 59,
    "defensiveSkill": 87,
    "precision": 80,
    "adaptability": 84,
    "potential": 96
  },
  "d007": {
    "qualifyingPace": 75,
    "racePace": 63,
    "consistency": 70,
    "racecraft": 51,
    "aggression": 55,
    "defensiveSkill": 75,
    "precision": 69,
    "adaptability": 82,
    "potential": 89
  },
  "d008": {
    "qualifyingPace": 77,
    "racePace": 83,
    "consistency": 90,
    "racecraft": 80,
    "aggression": 84,
    "defensiveSkill": 89,
    "precision": 85,
    "adaptability": 68,
    "potential": 86
  },
  "d009": {
    "qualifyingPace": 78,
    "racePace": 69,
    "consistency": 67,
    "racecraft": 77,
    "aggression": 80,
    "defensiveSkill": 77,
    "precision": 68,
    "adaptability": 66,
    "potential": 84
  },
  "d010": {
    "qualifyingPace": 74,
    "racePace": 80,
    "consistency": 68,
    "racecraft": 48,
    "aggression": 57,
    "defensiveSkill": 50,
    "precision": 63,
    "adaptability": 75,
    "potential": 91
  },
  "d011": {
    "qualifyingPace": 62,
    "racePace": 60,
    "consistency": 79,
    "racecraft": 50,
    "aggression": 61,
    "defensiveSkill": 62,
    "precision": 83,
    "adaptability": 77,
    "potential": 72
  },
  "d012": {
    "qualifyingPace": 66,
    "racePace": 58,
    "consistency": 50,
    "racecraft": 52,
    "aggression": 65,
    "defensiveSkill": 42,
    "precision": 55,
    "adaptability": 70,
    "potential": 88
  },
  "d013": {
    "qualifyingPace": 79,
    "racePace": 66,
    "consistency": 83,
    "racecraft": 55,
    "aggression": 69,
    "defensiveSkill": 86,
    "precision": 90,
    "adaptability": 80,
    "potential": 86
  },
  "d014": {
    "qualifyingPace": 75,
    "racePace": 77,
    "consistency": 85,
    "racecraft": 57,
    "aggression": 73,
    "defensiveSkill": 37,
    "precision": 86,
    "adaptability": 82,
    "potential": 85
  },
  "d015": {
    "qualifyingPace": 59,
    "racePace": 52,
    "consistency": 68,
    "racecraft": 59,
    "aggression": 77,
    "defensiveSkill": 49,
    "precision": 62,
    "adaptability": 83,
    "potential": 89
  },
  "d016": {
    "qualifyingPace": 70,
    "racePace": 78,
    "consistency": 75,
    "racecraft": 62,
    "aggression": 81,
    "defensiveSkill": 61,
    "precision": 78,
    "adaptability": 85,
    "potential": 90
  },
  "d017": {
    "qualifyingPace": 73,
    "racePace": 55,
    "consistency": 72,
    "racecraft": 64,
    "aggression": 85,
    "defensiveSkill": 73,
    "precision": 69,
    "adaptability": 86,
    "potential": 86
  },
  "d018": {
    "qualifyingPace": 73,
    "racePace": 69,
    "consistency": 83,
    "racecraft": 91,
    "aggression": 58,
    "defensiveSkill": 37,
    "precision": 76,
    "adaptability": 85,
    "potential": 84
  },
  "d019": {
    "qualifyingPace": 65,
    "racePace": 75,
    "consistency": 71,
    "racecraft": 93,
    "aggression": 62,
    "defensiveSkill": 49,
    "precision": 73,
    "adaptability": 86,
    "potential": 82
  },
  "d020": {
    "qualifyingPace": 74,
    "racePace": 63,
    "consistency": 90,
    "racecraft": 79,
    "aggression": 38,
    "defensiveSkill": 83,
    "precision": 89,
    "adaptability": 72,
    "potential": 81
  },
  "d021": {
    "qualifyingPace": 81,
    "racePace": 79,
    "consistency": 75,
    "racecraft": 77,
    "aggression": 34,
    "defensiveSkill": 71,
    "precision": 80,
    "adaptability": 71,
    "potential": 81
  },
  "d022": {
    "qualifyingPace": 63,
    "racePace": 59,
    "consistency": 87,
    "racecraft": 84,
    "aggression": 46,
    "defensiveSkill": 46,
    "precision": 89,
    "adaptability": 75,
    "potential": 79
  },
  "d023": {
    "qualifyingPace": 71,
    "racePace": 75,
    "consistency": 84,
    "racecraft": 81,
    "aggression": 42,
    "defensiveSkill": 95,
    "precision": 77,
    "adaptability": 74,
    "potential": 84
  },
  "d024": {
    "qualifyingPace": 76,
    "racePace": 61,
    "consistency": 87,
    "racecraft": 88,
    "aggression": 54,
    "defensiveSkill": 70,
    "precision": 91,
    "adaptability": 78,
    "potential": 78
  },
  "d025": {
    "qualifyingPace": 82,
    "racePace": 92,
    "consistency": 88,
    "racecraft": 86,
    "aggression": 50,
    "defensiveSkill": 58,
    "precision": 83,
    "adaptability": 77,
    "potential": 94
  },
  "d026": {
    "qualifyingPace": 79,
    "racePace": 93,
    "consistency": 84,
    "racecraft": 93,
    "aggression": 62,
    "defensiveSkill": 94,
    "precision": 91,
    "adaptability": 82,
    "potential": 87
  },
  "d027": {
    "qualifyingPace": 84,
    "racePace": 83,
    "consistency": 82,
    "racecraft": 91,
    "aggression": 58,
    "defensiveSkill": 82,
    "precision": 80,
    "adaptability": 80,
    "potential": 90
  },
  "d028": {
    "qualifyingPace": 94,
    "racePace": 95,
    "consistency": 90,
    "racecraft": 48,
    "aggression": 70,
    "defensiveSkill": 57,
    "precision": 84,
    "adaptability": 85,
    "potential": 92
  },
  "d029": {
    "qualifyingPace": 72,
    "racePace": 77,
    "consistency": 86,
    "racecraft": 46,
    "aggression": 66,
    "defensiveSkill": 45,
    "precision": 86,
    "adaptability": 83,
    "potential": 84
  },
  "d030": {
    "qualifyingPace": 71,
    "racePace": 74,
    "consistency": 82,
    "racecraft": 50,
    "aggression": 46,
    "defensiveSkill": 76,
    "precision": 82,
    "adaptability": 86,
    "potential": 85
  },
  "d031": {
    "qualifyingPace": 88,
    "racePace": 89,
    "consistency": 70,
    "racecraft": 52,
    "aggression": 50,
    "defensiveSkill": 88,
    "precision": 64,
    "adaptability": 87,
    "potential": 92
  },
  "d032": {
    "qualifyingPace": 78,
    "racePace": 75,
    "consistency": 83,
    "racecraft": 45,
    "aggression": 38,
    "defensiveSkill": 52,
    "precision": 81,
    "adaptability": 83,
    "potential": 86
  },
  "d033": {
    "qualifyingPace": 74,
    "racePace": 86,
    "consistency": 83,
    "racecraft": 47,
    "aggression": 42,
    "defensiveSkill": 64,
    "precision": 90,
    "adaptability": 84,
    "potential": 86
  },
  "d034": {
    "qualifyingPace": 70,
    "racePace": 78,
    "consistency": 72,
    "racecraft": 90,
    "aggression": 29,
    "defensiveSkill": 89,
    "precision": 67,
    "adaptability": 79,
    "potential": 97
  },
  "d035": {
    "qualifyingPace": 61,
    "racePace": 60,
    "consistency": 42,
    "racecraft": 72,
    "aggression": 91,
    "defensiveSkill": 48,
    "precision": 50,
    "adaptability": 57,
    "potential": 79
  },
  "d036": {
    "qualifyingPace": 73,
    "racePace": 75,
    "consistency": 84,
    "racecraft": 86,
    "aggression": 87,
    "defensiveSkill": 65,
    "precision": 77,
    "adaptability": 76,
    "potential": 86
  },
  "d037": {
    "qualifyingPace": 70,
    "racePace": 63,
    "consistency": 72,
    "racecraft": 88,
    "aggression": 25,
    "defensiveSkill": 77,
    "precision": 73,
    "adaptability": 78,
    "potential": 91
  },
  "d038": {
    "qualifyingPace": 85,
    "racePace": 81,
    "consistency": 67,
    "racecraft": 81,
    "aggression": 79,
    "defensiveSkill": 41,
    "precision": 72,
    "adaptability": 73,
    "potential": 91
  },
  "campaign-veteran-001": {
    "qualifyingPace": 56,
    "racePace": 61,
    "consistency": 90,
    "racecraft": 80,
    "aggression": 30,
    "defensiveSkill": 86,
    "precision": 86,
    "adaptability": 80,
    "potential": 64
  }
};
  Object.values(profiles).forEach(Object.freeze);
  CGPArcade.DriverAttributes = Object.freeze({version:1, profiles:Object.freeze(profiles)});
})();
