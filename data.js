/* ============================================================
   LAYER 1 — COURSE CATALOG
   Flat. Every course, its credits, and what must come first.
   This layer knows nothing about degrees.
   ============================================================ */
const COURSES = {
  // --- Computer Science ---
  'CSCI-UA 2':   {name:'Intro to Computer Programming (No Prior Experience)', credits:4, prereqs:[], gated:true},
  'CSCI-UA 3':   {name:'Intro to Computer Programming (Limited Experience)',  credits:4, prereqs:[], gated:true},
  'CSCI-UA 101': {name:'Introduction to Computer Science', credits:4, prereqs:['CSCI-UA 2','CSCI-UA 3']},
  'CSCI-UA 102': {name:'Data Structures',                  credits:4, prereqs:['CSCI-UA 101']},
  'CSCI-UA 201': {name:'Computer Systems Organization',    credits:4, prereqs:['CSCI-UA 102']},
  'CSCI-UA 202': {name:'Operating Systems',                credits:4, prereqs:['CSCI-UA 201']},
  'CSCI-UA 310': {name:'Basic Algorithms',                 credits:4, prereqs:['CSCI-UA 102','MATH-UA 120']},
  'CSCI-UA 421': {name:'Numerical Computing',              credits:4, prereqs:['CSCI-UA 102','MATH-UA 140']},

  // --- Mathematics: Calculus sequence ---
  'MATH-UA 9':   {name:'Algebra, Trigonometry, and Functions', credits:4, prereqs:[]},
  'MATH-UA 121': {name:'Calculus I',   credits:4, prereqs:['MATH-UA 9'], gated:true},
  'MATH-UA 122': {name:'Calculus II',  credits:4, prereqs:['MATH-UA 121'], gated:true},
  'MATH-UA 123': {name:'Calculus III', credits:4, prereqs:['MATH-UA 122'], gated:true},

  // --- Mathematics: Math for Economics sequence (formerly 211/212/213) ---
  'MATH-UA 131': {name:'Mathematics for Economics I',   credits:4, prereqs:['MATH-UA 9'], gated:true},
  'MATH-UA 132': {name:'Mathematics for Economics II',  credits:4, prereqs:['MATH-UA 131'], gated:true},
  'MATH-UA 133': {name:'Mathematics for Economics III', credits:4, prereqs:['MATH-UA 132'], gated:true},

  'MATH-UA 120': {name:'Discrete Mathematics', credits:4, prereqs:['MATH-UA 9']},
  'MATH-UA 140': {name:'Linear Algebra',       credits:4, prereqs:['MATH-UA 9']},

  // --- Economics ---
  'ECON-UA 1':   {name:'Introduction to Macroeconomics', credits:4, prereqs:[]},
  'ECON-UA 2':   {name:'Introduction to Microeconomics', credits:4, prereqs:[]},
  'ECON-UA 10':  {name:'Intermediate Microeconomics (Policy)', credits:4, prereqs:['ECON-UA 2','MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 12':  {name:'Intermediate Macroeconomics (Policy)', credits:4, prereqs:['ECON-UA 1','ECON-UA 10'], gated:true},
  'ECON-UA 11':  {name:'Microeconomic Analysis (Theory)',      credits:4, prereqs:['ECON-UA 2','MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 13':  {name:'Macroeconomic Analysis (Theory)',      credits:4, prereqs:['ECON-UA 1','ECON-UA 11'], gated:true},
  'ECON-UA 18':  {name:'Statistics (Policy)',           credits:4, prereqs:['MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 20':  {name:'Analytical Statistics (Theory)', credits:4, prereqs:['MATH-UA 132','MATH-UA 122'], gated:true},
  'ECON-UA 266': {name:'Introduction to Econometrics',  credits:4, prereqs:['ECON-UA 18','ECON-UA 20']},

  // --- CAS Core placeholders (each stands for a category of options) ---
  'CORE-FYS':    {name:'First-Year Seminar',   credits:4, prereqs:[], core:true},
  'EXPOS-UA 1':  {name:'Writing as Inquiry',   credits:4, prereqs:[], core:true},
  'LANG-1': {name:'Foreign Language: Elementary I',    credits:4, prereqs:[],         core:true, gated:true},
  'LANG-2': {name:'Foreign Language: Elementary II',   credits:4, prereqs:['LANG-1'], core:true, gated:true},
  'LANG-3': {name:'Foreign Language: Intermediate I',  credits:4, prereqs:['LANG-2'], core:true, gated:true},
  'LANG-4': {name:'Foreign Language: Intermediate II', credits:4, prereqs:['LANG-3'], core:true, gated:true},
  'CORE-TI':  {name:'Texts and Ideas',              credits:4, prereqs:[], core:true},
  'CORE-CC':  {name:'Cultures and Contexts',        credits:4, prereqs:[], core:true},
  'CORE-EC':  {name:'Expressive Culture',           credits:4, prereqs:[], core:true},
  'CORE-SSS': {name:'Societies and the Social Sciences', credits:4, prereqs:[], core:true},
  'CORE-QR':  {name:'Quantitative Reasoning', credits:4, prereqs:[], core:true},
  'CORE-PS':  {name:'Physical Science',       credits:4, prereqs:[], core:true},
  'CORE-LS':  {name:'Life Science',           credits:4, prereqs:[], core:true}
};

/* ============================================================
   LAYER 2 — REQUIREMENT TREES
   A degree is not a list of courses, it is an AND/OR tree.

     group   every child is required            (AND)
     choice  pick exactly one option            (OR / exclusive)
     slots   pick n courses from a pool         (choose-k)
     course  a leaf, resolves to a course code

   Resolving the tree against a set of choices produces the flat
   course list that Layer 1's graph algorithms then run on.
   ============================================================ */
const G  = (label, ...children) => ({kind:'group', label, children});
const C  = (code) => ({kind:'course', code});
const CH = (id, label, note, options) => ({kind:'choice', id, label, note, options});
const OPT= (label, ...children) => ({label, children});
const SL = (label, n, after, prefix) => ({kind:'slots', label, n, after, prefix});

/* --- The CAS Core, shared by every degree in the College --- */
const CAS_CORE = G('CAS Core Curriculum',
  G('First-Year Seminar', C('CORE-FYS')),
  G('Expository Writing', C('EXPOS-UA 1')),
  CH('lang', 'Foreign Language', 'Proficiency through the intermediate level, or exemption by placement or AP.', [
    OPT('No prior study (4 courses)', C('LANG-1'), C('LANG-2'), C('LANG-3'), C('LANG-4')),
    OPT('Placed into intermediate (2 courses)', C('LANG-3'), C('LANG-4')),
    OPT('Exempt by placement or AP (0 courses)')
  ]),
  G('Foundations of Contemporary Culture',
    C('CORE-TI'), C('CORE-CC'), C('CORE-EC'), C('CORE-SSS')),
  G('Foundations of Scientific Inquiry',
    C('CORE-QR'), C('CORE-PS'), C('CORE-LS'))
);

/* --- The mathematics fork, the one NYU forbids mixing --- */
const MATH_SEQUENCE_3 = CH('mathseq', 'Mathematics sequence',
  'NYU does not permit mixing or double counting between these two sequences. Math for Economics is restricted to Economics majors, and AP Calculus credit cannot place you ahead in it.', [
    OPT('Mathematics for Economics I–III', C('MATH-UA 131'), C('MATH-UA 132'), C('MATH-UA 133')),
    OPT('Calculus I–III', C('MATH-UA 121'), C('MATH-UA 122'), C('MATH-UA 123'))
  ]);

const MATH_SEQUENCE_2 = CH('mathseq', 'Mathematics sequence',
  'NYU does not permit mixing or double counting between these two sequences.', [
    OPT('Mathematics for Economics I–II', C('MATH-UA 131'), C('MATH-UA 132')),
    OPT('Calculus I–II', C('MATH-UA 121'), C('MATH-UA 122'))
  ]);

const CS_ENTRY = CH('csentry', 'Entry into Computer Science',
  'CSCI-UA 101 requires one of these, unless you hold a qualifying AP Computer Science score.', [
    OPT('CSCI-UA 2, no prior programming', C('CSCI-UA 2')),
    OPT('CSCI-UA 3, some prior programming', C('CSCI-UA 3')),
    OPT('AP Computer Science credit')
  ]);

const ECON_CONCENTRATION = CH('econconc', 'Economics concentration',
  'Joint majors with Computer Science or Mathematics must take the Theory concentration.', [
    OPT('Theory', C('ECON-UA 20'), C('ECON-UA 11'), C('ECON-UA 13')),
    OPT('Policy', C('ECON-UA 18'), C('ECON-UA 10'), C('ECON-UA 12'))
  ]);

/* --- Degrees --- */
const DEGREES = {
  'econcs': {
    name: 'Economics & Computer Science (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    tree: G('Economics & Computer Science (BA)',
      CAS_CORE,
      G('Computer Science',
        CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'),
        C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('CS 400-level electives', 4, 'CSCI-UA 310', 'CS-ELEC')),
      G('Mathematics',
        C('MATH-UA 9'), C('MATH-UA 120'), MATH_SEQUENCE_3),
      G('Economics',
        C('ECON-UA 1'), C('ECON-UA 2'), ECON_CONCENTRATION, C('ECON-UA 266'))
    )
  },

  'econ': {
    name: 'Economics (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    tree: G('Economics (BA)',
      CAS_CORE,
      G('Mathematics', C('MATH-UA 9'), MATH_SEQUENCE_2),
      G('Economics core',
        C('ECON-UA 1'), C('ECON-UA 2'), ECON_CONCENTRATION, C('ECON-UA 266')),
      G('Economics electives', SL('ECON-UA 200-level electives', 4, 'ECON-UA 266', 'ECON-ELEC'))
    )
  },

  'cs': {
    name: 'Computer Science (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    tree: G('Computer Science (BA)',
      CAS_CORE,
      G('Computer Science',
        CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'),
        C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('CS 400-level electives', 3, 'CSCI-UA 310', 'CS-ELEC')),
      G('Mathematics',
        C('MATH-UA 9'), C('MATH-UA 120'), C('MATH-UA 121'), C('MATH-UA 140'))
    )
  },

  'csmath': {
    name: 'Computer Science & Mathematics (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    tree: G('Computer Science & Mathematics (BA)',
      CAS_CORE,
      G('Computer Science',
        CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'),
        C('CSCI-UA 202'), C('CSCI-UA 310'), C('CSCI-UA 421'),
        SL('CS 400-level electives', 2, 'CSCI-UA 310', 'CS-ELEC')),
      G('Mathematics',
        C('MATH-UA 9'), C('MATH-UA 120'), C('MATH-UA 140'),
        C('MATH-UA 121'), C('MATH-UA 122'), C('MATH-UA 123'))
    )
  }
};

/* ============================================================
   LAYER 3 — EXEMPTIONS
   Major coursework can cover part of the Core, so a naive union
   of Core + major double counts. Each rule reads: this Core
   requirement is covered if any of these courses is already in
   the resolved set.

   Exemption policy varies by advisor and catalogue year. Check
   your degree audit in Albert and edit this table to match.
   ============================================================ */
const EXEMPTIONS = [
  {core:'CORE-QR',  by:['MATH-UA 121','MATH-UA 131'],
   note:'The calculus or Math for Economics sequence covers quantitative reasoning'},
  {core:'CORE-SSS', by:['ECON-UA 1','ECON-UA 2'],
   note:'Introductory economics counts as a social science'}
];
