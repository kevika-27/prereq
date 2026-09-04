/* ============================================================
   LAYER 1 — COURSE CATALOG

   `offered` lists the terms a course runs. Verified entries are
   marked VERIFIED against the CS department's published sequence;
   everything marked TODO is a placeholder for you to correct from
   Albert. Getting this wrong makes the planner confidently wrong,
   so treat unverified entries as unknown rather than true.
   ============================================================ */
const BOTH = ['fall','spring'];

const COURSES = {
  // --- Computer Science: core sequence (offerings VERIFIED) ---
  'CSCI-UA 2':   {name:'Intro to Computer Programming (No Prior Experience)', credits:4, prereqs:[], offered:BOTH, gated:true},
  'CSCI-UA 3':   {name:'Intro to Computer Programming (Limited Experience)',  credits:4, prereqs:[], offered:BOTH, gated:true},
  'CSCI-UA 101': {name:'Introduction to Computer Science', credits:4, offered:BOTH, prereqs:['CSCI-UA 2','CSCI-UA 3']},
  'CSCI-UA 102': {name:'Data Structures',                  credits:4, offered:BOTH, prereqs:['CSCI-UA 101']},
  'CSCI-UA 201': {name:'Computer Systems Organization',    credits:4, offered:BOTH, prereqs:['CSCI-UA 102']},
  'CSCI-UA 202': {name:'Operating Systems',                credits:4, offered:BOTH, prereqs:['CSCI-UA 201']},
  // 310 needs Discrete Math AND a calculus course. The calculus
  // half is gated so it follows whichever sequence you chose.
  'CSCI-UA 310': {name:'Basic Algorithms', credits:4, offered:BOTH,
                  prereqs:['CSCI-UA 102','MATH-UA 120','MATH-UA 121','MATH-UA 131']},

  // --- Computer Science: 400-level electives (offerings TODO) ---
  'CSCI-UA 421': {name:'Numerical Computing',            credits:4, offered:BOTH, prereqs:['CSCI-UA 102','MATH-UA 140'], elective:true},
  'CSCI-UA 449': {name:'Computer Networks',              credits:4, offered:BOTH, prereqs:['CSCI-UA 202'], elective:true},
  'CSCI-UA 453': {name:'Theory of Computation',          credits:4, offered:BOTH, prereqs:['CSCI-UA 310'], elective:true},
  'CSCI-UA 467': {name:'Applied Internet Technology',    credits:4, offered:BOTH, prereqs:['CSCI-UA 201'], elective:true},
  'CSCI-UA 469': {name:'Natural Language Processing',    credits:4, offered:BOTH, prereqs:['CSCI-UA 310'], elective:true},
  'CSCI-UA 470': {name:'Compiler Construction',          credits:4, offered:BOTH, prereqs:['CSCI-UA 201'], elective:true},
  'CSCI-UA 472': {name:'Artificial Intelligence',        credits:4, offered:BOTH, prereqs:['CSCI-UA 310'], elective:true},
  'CSCI-UA 473': {name:'Fundamentals of Machine Learning', credits:4, offered:BOTH, prereqs:['CSCI-UA 310','MATH-UA 140'], elective:true},
  'CSCI-UA 476': {name:'Processing Big Data',            credits:4, offered:BOTH, prereqs:['CSCI-UA 310'], elective:true},
  'CSCI-UA 479': {name:'Data Management and Analysis',   credits:4, offered:BOTH, prereqs:['CSCI-UA 201'], elective:true},
  'CSCI-UA 480': {name:'Special Topics in Computer Science', credits:4, offered:BOTH, prereqs:['CSCI-UA 310'], elective:true},

  // --- Mathematics ---
  'MATH-UA 9':   {name:'Algebra, Trigonometry, and Functions', credits:4, offered:BOTH, prereqs:[]},
  'MATH-UA 121': {name:'Calculus I',   credits:4, offered:BOTH, prereqs:['MATH-UA 9'],   gated:true},
  'MATH-UA 122': {name:'Calculus II',  credits:4, offered:BOTH, prereqs:['MATH-UA 121'], gated:true},
  'MATH-UA 123': {name:'Calculus III', credits:4, offered:BOTH, prereqs:['MATH-UA 122'], gated:true},
  'MATH-UA 131': {name:'Mathematics for Economics I',   credits:4, offered:BOTH, prereqs:['MATH-UA 9'],   gated:true},
  'MATH-UA 132': {name:'Mathematics for Economics II',  credits:4, offered:BOTH, prereqs:['MATH-UA 131'], gated:true},
  'MATH-UA 133': {name:'Mathematics for Economics III', credits:4, offered:BOTH, prereqs:['MATH-UA 132'], gated:true},
  'MATH-UA 120': {name:'Discrete Mathematics', credits:4, offered:BOTH, prereqs:['MATH-UA 9']},
  'MATH-UA 140': {name:'Linear Algebra',       credits:4, offered:BOTH, prereqs:['MATH-UA 9']},
  'MATH-UA 235': {name:'Probability and Statistics', credits:4, offered:BOTH, prereqs:['MATH-UA 121','MATH-UA 131'], elective:true},

  // --- Economics ---
  'ECON-UA 1':   {name:'Introduction to Macroeconomics', credits:4, offered:BOTH, prereqs:[]},
  'ECON-UA 2':   {name:'Introduction to Microeconomics', credits:4, offered:BOTH, prereqs:[]},
  'ECON-UA 10':  {name:'Intermediate Microeconomics (Policy)', credits:4, offered:BOTH, prereqs:['ECON-UA 2','MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 12':  {name:'Intermediate Macroeconomics (Policy)', credits:4, offered:BOTH, prereqs:['ECON-UA 1','ECON-UA 10'], gated:true},
  'ECON-UA 11':  {name:'Microeconomic Analysis (Theory)',      credits:4, offered:BOTH, prereqs:['ECON-UA 2','MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 13':  {name:'Macroeconomic Analysis (Theory)',      credits:4, offered:BOTH, prereqs:['ECON-UA 1','ECON-UA 11'], gated:true},
  'ECON-UA 18':  {name:'Statistics (Policy)',            credits:4, offered:BOTH, prereqs:['MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 20':  {name:'Analytical Statistics (Theory)', credits:4, offered:BOTH, prereqs:['MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 266': {name:'Introduction to Econometrics',   credits:4, offered:BOTH, prereqs:['ECON-UA 18','ECON-UA 20']},
  'ECON-UA 216': {name:'Money and Banking',              credits:4, offered:BOTH, prereqs:['ECON-UA 11','ECON-UA 10'], elective:true},
  'ECON-UA 230': {name:'Financial Economics',            credits:4, offered:BOTH, prereqs:['ECON-UA 11','ECON-UA 10'], elective:true},
  'ECON-UA 238': {name:'International Economics',        credits:4, offered:BOTH, prereqs:['ECON-UA 11','ECON-UA 10'], elective:true},
  'ECON-UA 323': {name:'Labor Economics',                credits:4, offered:BOTH, prereqs:['ECON-UA 11','ECON-UA 10'], elective:true},

  // --- CAS Core placeholders (each stands for a category) ---
  'CORE-FYS':   {name:'First-Year Seminar', credits:4, offered:BOTH, prereqs:[], core:true},
  'EXPOS-UA 1': {name:'Writing as Inquiry', credits:4, offered:BOTH, prereqs:[], core:true},
  'LANG-1': {name:'Foreign Language: Elementary I',    credits:4, offered:BOTH, prereqs:[],         core:true, gated:true},
  'LANG-2': {name:'Foreign Language: Elementary II',   credits:4, offered:BOTH, prereqs:['LANG-1'], core:true, gated:true},
  'LANG-3': {name:'Foreign Language: Intermediate I',  credits:4, offered:BOTH, prereqs:['LANG-2'], core:true, gated:true},
  'LANG-4': {name:'Foreign Language: Intermediate II', credits:4, offered:BOTH, prereqs:['LANG-3'], core:true, gated:true},
  'CORE-TI':  {name:'Texts and Ideas',                     credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-CC':  {name:'Cultures and Contexts',               credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-EC':  {name:'Expressive Culture',                  credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-SSS': {name:'Societies and the Social Sciences',   credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-QR':  {name:'Quantitative Reasoning', credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-PS':  {name:'Physical Science',       credits:4, offered:BOTH, prereqs:[], core:true},
  'CORE-LS':  {name:'Life Science',           credits:4, offered:BOTH, prereqs:[], core:true}
};

/* ============================================================
   LAYER 2 — ELECTIVE POOLS
   A requirement like "four 400-level CS electives" is a
   choose-k over a pool, not four fixed courses. Each option
   carries its own prerequisites, so which four you pick changes
   the shape of the graph and can change your critical path.
   ============================================================ */
const POOLS = {
  CS400: {
    label: 'CSCI-UA 400-level elective',
    courses: ['CSCI-UA 421','CSCI-UA 449','CSCI-UA 453','CSCI-UA 467','CSCI-UA 469',
              'CSCI-UA 470','CSCI-UA 472','CSCI-UA 473','CSCI-UA 476','CSCI-UA 479','CSCI-UA 480']
  },
  ECON200: {
    label: 'ECON-UA 200-level elective',
    courses: ['ECON-UA 216','ECON-UA 230','ECON-UA 238','ECON-UA 323']
  }
};

/* ============================================================
   LAYER 3 — REQUIREMENT TREES
     group   every child required        (AND)
     choice  pick exactly one option     (OR, exclusive)
     slots   pick n from a named pool    (choose-k)
     course  a leaf
   ============================================================ */
const G  = (label, ...children) => ({kind:'group', label, children});
const C  = (code) => ({kind:'course', code});
const CH = (id, label, note, options) => ({kind:'choice', id, label, note, options});
const OPT= (label, ...children) => ({label, children});
const SL = (id, pool, n) => ({kind:'slots', id, pool, n});

const CAS_CORE = G('CAS Core Curriculum',
  G('First-Year Seminar', C('CORE-FYS')),
  G('Expository Writing', C('EXPOS-UA 1')),
  CH('lang', 'Foreign Language', 'Proficiency through the intermediate level, or exemption by placement or AP.', [
    OPT('No prior study (4 courses)', C('LANG-1'), C('LANG-2'), C('LANG-3'), C('LANG-4')),
    OPT('Placed into intermediate (2 courses)', C('LANG-3'), C('LANG-4')),
    OPT('Exempt by placement or AP (0 courses)')
  ]),
  G('Foundations of Contemporary Culture', C('CORE-TI'), C('CORE-CC'), C('CORE-EC'), C('CORE-SSS')),
  G('Foundations of Scientific Inquiry', C('CORE-QR'), C('CORE-PS'), C('CORE-LS'))
);

const MATH_SEQ_3 = CH('mathseq', 'Mathematics sequence',
  'NYU forbids mixing or double counting between these sequences. Math for Economics is restricted to Economics majors, and AP Calculus credit cannot place you ahead in it.', [
    OPT('Mathematics for Economics I\u2013III', C('MATH-UA 131'), C('MATH-UA 132'), C('MATH-UA 133')),
    OPT('Calculus I\u2013III', C('MATH-UA 121'), C('MATH-UA 122'), C('MATH-UA 123'))
  ]);

const MATH_SEQ_2 = CH('mathseq', 'Mathematics sequence',
  'NYU forbids mixing or double counting between these sequences.', [
    OPT('Mathematics for Economics I\u2013II', C('MATH-UA 131'), C('MATH-UA 132')),
    OPT('Calculus I\u2013II', C('MATH-UA 121'), C('MATH-UA 122'))
  ]);

const CS_ENTRY = CH('csentry', 'Entry into Computer Science',
  'CSCI-UA 101 requires one of these unless you hold a qualifying AP Computer Science score or pass the placement exam.', [
    OPT('CSCI-UA 2, no prior programming', C('CSCI-UA 2')),
    OPT('CSCI-UA 3, some prior programming', C('CSCI-UA 3')),
    OPT('AP credit or placement exam')
  ]);

const ECON_CONC = CH('econconc', 'Economics concentration',
  'Joint majors with Computer Science or Mathematics must take the Theory concentration.', [
    OPT('Theory', C('ECON-UA 20'), C('ECON-UA 11'), C('ECON-UA 13')),
    OPT('Policy', C('ECON-UA 18'), C('ECON-UA 10'), C('ECON-UA 12'))
  ]);

const DEGREES = {
  'econcs': {
    name:'Economics & Computer Science (BA)', school:'College of Arts and Science', totalCredits:128,
    tree: G('Economics & Computer Science (BA)',
      CAS_CORE,
      G('Computer Science', CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'), C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('cs400', 'CS400', 4)),
      G('Mathematics', C('MATH-UA 9'), C('MATH-UA 120'), MATH_SEQ_3),
      G('Economics', C('ECON-UA 1'), C('ECON-UA 2'), ECON_CONC, C('ECON-UA 266')))
  },
  'econ': {
    name:'Economics (BA)', school:'College of Arts and Science', totalCredits:128,
    tree: G('Economics (BA)',
      CAS_CORE,
      G('Mathematics', C('MATH-UA 9'), MATH_SEQ_2),
      G('Economics core', C('ECON-UA 1'), C('ECON-UA 2'), ECON_CONC, C('ECON-UA 266')),
      G('Economics electives', SL('econ200', 'ECON200', 4)))
  },
  'cs': {
    name:'Computer Science (BA)', school:'College of Arts and Science', totalCredits:128,
    tree: G('Computer Science (BA)',
      CAS_CORE,
      G('Computer Science', CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'), C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('cs400', 'CS400', 5)),
      G('Mathematics', C('MATH-UA 9'), C('MATH-UA 120'), C('MATH-UA 121')))
  },
  'csmath': {
    name:'Computer Science & Mathematics (BA)', school:'College of Arts and Science', totalCredits:128,
    tree: G('Computer Science & Mathematics (BA)',
      CAS_CORE,
      G('Computer Science', CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'), C('CSCI-UA 202'),
        C('CSCI-UA 310'), C('CSCI-UA 421'), SL('cs400', 'CS400', 2)),
      G('Mathematics', C('MATH-UA 9'), C('MATH-UA 120'), C('MATH-UA 140'),
        C('MATH-UA 121'), C('MATH-UA 122'), C('MATH-UA 123')))
  }
};

/* ============================================================
   LAYER 4 — EXEMPTIONS
   Major coursework can cover part of the Core, so a naive union
   double counts. Policy varies by advisor and catalogue year:
   check your degree audit and edit this table.
   ============================================================ */
const EXEMPTIONS = [
  {core:'CORE-QR',  by:['MATH-UA 121','MATH-UA 131'],
   note:'The calculus or Math for Economics sequence covers quantitative reasoning'},
  {core:'CORE-SSS', by:['ECON-UA 1','ECON-UA 2'],
   note:'Introductory economics counts as a social science'}
];
