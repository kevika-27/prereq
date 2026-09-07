/* ============================================================
   NYU DEGREE DATA

   Every requirement here is transcribed from the 2026-2027 NYU
   Bulletin program pages, which publish each degree as a credit
   table that sums to 128. Where the Bulletin and a department
   page disagree, the Bulletin wins.

     Economics and Computer Science (BA)
       bulletins.nyu.edu/undergraduate/arts-science/programs/
         economics-computer-science-ba/
     Computer Science (BA)
       bulletins.nyu.edu/undergraduate/arts-science/programs/
         computer-science-ba/

   Only degrees whose full credit table has been transcribed are
   included. Adding one means copying its table, not estimating it.

   Course prerequisites and term offerings for CSCI-UA come from
   the Bulletin course pages. MATH-UA and ECON-UA sequencing
   follows each degree's published Sample Plan of Study, which is
   the ordering NYU itself recommends; run scrape.py to replace
   these with exact catalogue prerequisites.
   ============================================================ */

const BOTH = ['fall', 'spring'];
const ALL_TERMS = ['fall', 'spring', 'summer'];

const COURSES = {
  /* --- Computer Science. Offerings and prerequisites verified
         against bulletins.nyu.edu/courses/csci_ua/ --- */
  'CSCI-UA 2':   {name:'Introduction to Computer Programming (No Prior Experience)',
                  credits:4, offered:ALL_TERMS, prereqs:[], gated:true},
  'CSCI-UA 3':   {name:'Introduction to Computer Programming (Limited Prior Experience)',
                  credits:4, offered:BOTH, prereqs:[], gated:true},
  'CSCI-UA 101': {name:'Intro to Computer Science', credits:4, offered:BOTH,
                  prereqs:['CSCI-UA 2','CSCI-UA 3']},
  'CSCI-UA 102': {name:'Data Structures', credits:4, offered:BOTH,
                  prereqs:['CSCI-UA 101']},
  'CSCI-UA 201': {name:'Computer Systems Organization', credits:4, offered:ALL_TERMS,
                  prereqs:['CSCI-UA 102']},
  'CSCI-UA 202': {name:'Operating Systems', credits:4, offered:BOTH,
                  prereqs:['CSCI-UA 201']},
  // Bulletin: CSCI-UA 102 AND MATH-UA 120 AND (MATH-UA 121 OR MATH-UA 131).
  // The calculus half is gated so it follows whichever track is chosen.
  'CSCI-UA 310': {name:'Basic Algorithms', credits:4, offered:ALL_TERMS,
                  prereqs:['CSCI-UA 102','MATH-UA 120','MATH-UA 121','MATH-UA 131']},

  /* --- CSCI-UA 400-level electives --- */
  'CSCI-UA 421': {name:'Numerical Computing', credits:4, offered:['spring'],
                  prereqs:['CSCI-UA 102','MATH-UA 140']},
  'CSCI-UA 449': {name:'Computer Networks', credits:4, offered:BOTH, prereqs:['CSCI-UA 202']},
  'CSCI-UA 453': {name:'Theory of Computation', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},
  'CSCI-UA 467': {name:'Applied Internet Technology', credits:4, offered:BOTH, prereqs:['CSCI-UA 201']},
  'CSCI-UA 469': {name:'Natural Language Processing', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},
  'CSCI-UA 470': {name:'Compiler Construction', credits:4, offered:BOTH, prereqs:['CSCI-UA 201']},
  'CSCI-UA 472': {name:'Artificial Intelligence', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},
  'CSCI-UA 473': {name:'Fundamentals of Machine Learning', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},
  'CSCI-UA 476': {name:'Processing Big Data', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},
  'CSCI-UA 479': {name:'Data Management and Analysis', credits:4, offered:BOTH, prereqs:['CSCI-UA 201']},
  'CSCI-UA 480': {name:'Special Topics in Computer Science', credits:4, offered:BOTH, prereqs:['CSCI-UA 310']},

  /* --- Mathematics. The two tracks are mutually exclusive: the
         Bulletin states students cannot mix courses between them. --- */
  'MATH-UA 120': {name:'Discrete Mathematics', credits:4, offered:BOTH, prereqs:[]},
  'MATH-UA 121': {name:'Calculus I',  credits:4, offered:BOTH, prereqs:[], gated:true},
  'MATH-UA 122': {name:'Calculus II', credits:4, offered:BOTH, prereqs:['MATH-UA 121'], gated:true},
  'MATH-UA 131': {name:'Mathematics for Economics I',   credits:4, offered:BOTH, prereqs:[], gated:true},
  'MATH-UA 132': {name:'Mathematics for Economics II',  credits:4, offered:BOTH, prereqs:['MATH-UA 131'], gated:true},
  'MATH-UA 133': {name:'Mathematics for Economics III', credits:4, offered:BOTH, prereqs:['MATH-UA 132'], gated:true},
  'MATH-UA 140': {name:'Linear Algebra', credits:4, offered:BOTH, prereqs:[]},
  'MATH-UA 334': {name:'Mathematical Statistics', credits:4, offered:BOTH,
                  prereqs:['MATH-UA 133'], gated:true},

  /* --- Economics. Ordering follows the Bulletin Sample Plan of
         Study for the Economics and Computer Science joint major. --- */
  'ECON-UA 1':   {name:'Introduction to Macroeconomics', credits:4, offered:BOTH, prereqs:[], gated:true},
  'ECON-UA 2':   {name:'Introduction to Microeconomics', credits:4, offered:BOTH, prereqs:[], gated:true},
  'ECON-UA 11':  {name:'Microeconomic Analysis', credits:4, offered:BOTH,
                  prereqs:['ECON-UA 1','ECON-UA 2','MATH-UA 132']},
  'ECON-UA 13':  {name:'Macroeconomic Analysis', credits:4, offered:BOTH, prereqs:['ECON-UA 11']},
  'ECON-UA 20':  {name:'Analytical Statistics', credits:4, offered:BOTH,
                  prereqs:['MATH-UA 132'], gated:true},
  'ECON-UA 266': {name:'Intro to Econometrics', credits:4, offered:BOTH,
                  prereqs:['ECON-UA 20','MATH-UA 334']},

  /* --- Advanced economics electives, 300-level theory --- */
  'ECON-UA 310': {name:'Game Theory', credits:4, offered:BOTH, prereqs:['ECON-UA 11']},
  'ECON-UA 323': {name:'Econometrics II', credits:4, offered:BOTH, prereqs:['ECON-UA 266']},
  'ECON-UA 350': {name:'Advanced Macro Theory', credits:4, offered:BOTH, prereqs:['ECON-UA 13']},
  'ECON-UA 365': {name:'Advanced Micro Theory', credits:4, offered:BOTH, prereqs:['ECON-UA 11']},

  /* --- General Education placeholders. Each stands for a whole
         category of courses, which is how the Bulletin's own credit
         table lists them. --- */
  'GE-FYS':      {name:'First-Year Seminar', credits:4, offered:BOTH, prereqs:[], gened:true},
  'EXPOS-UA 1':  {name:'Writing as Inquiry', credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-LANG-1':   {name:'Foreign Language I',   credits:4, offered:BOTH, prereqs:[], gened:true, gated:true},
  'GE-LANG-2':   {name:'Foreign Language II',  credits:4, offered:BOTH, prereqs:['GE-LANG-1'], gened:true, gated:true},
  'GE-LANG-3':   {name:'Foreign Language III', credits:4, offered:BOTH, prereqs:['GE-LANG-2'], gened:true, gated:true},
  'GE-LANG-4':   {name:'Foreign Language IV',  credits:4, offered:BOTH, prereqs:['GE-LANG-3'], gened:true, gated:true},
  'GE-PS':       {name:'Physical Science', credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-LS':       {name:'Life Science',     credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-TI':       {name:'Texts and Ideas',  credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-CC':       {name:'Cultures and Contexts', credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-SSS':      {name:'Societies and the Social Sciences', credits:4, offered:BOTH, prereqs:[], gened:true},
  'GE-EC':       {name:'Expressive Culture', credits:4, offered:BOTH, prereqs:[], gened:true}
};

/* ============================================================
   ELECTIVE POOLS
   A requirement like "select four computer science electives at
   the 400 level" is a choose-k over a pool, not four fixed
   courses. Each option carries its own prerequisites, so which
   ones you pick changes the shape of the graph.
   ============================================================ */
const POOLS = {
  CS400: {
    label: 'CSCI-UA 400-level elective',
    courses: ['CSCI-UA 421','CSCI-UA 449','CSCI-UA 453','CSCI-UA 467','CSCI-UA 469',
              'CSCI-UA 470','CSCI-UA 472','CSCI-UA 473','CSCI-UA 476','CSCI-UA 479','CSCI-UA 480']
  },
  ECON300: {
    label: 'ECON-UA 300-level theory elective',
    courses: ['ECON-UA 310','ECON-UA 323','ECON-UA 350','ECON-UA 365']
  }
};

/* ============================================================
   REQUIREMENT TREES
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

const LANGUAGE = CH('lang', 'Foreign Language',
  'The Bulletin budgets 16 credits for language. Placing out reduces that directly, and it is the single largest variable in either degree.', [
    OPT('16 credits, no prior study', C('GE-LANG-1'), C('GE-LANG-2'), C('GE-LANG-3'), C('GE-LANG-4')),
    OPT('8 credits, placed into intermediate', C('GE-LANG-3'), C('GE-LANG-4')),
    OPT('0 credits, exempt by placement or AP')
  ]);

/* Economics and Computer Science omits Societies and the Social
   Sciences from its General Education table: the economics
   requirement covers it. Computer Science includes it. This is
   transcribed from the two Bulletin tables, not inferred. */
const GENED_ECONCS = G('General Education (44 credits)',
  C('GE-FYS'), C('EXPOS-UA 1'), LANGUAGE,
  C('GE-PS'), C('GE-LS'), C('GE-TI'), C('GE-CC'), C('GE-EC'));

const GENED_CS = G('General Education (48 credits)',
  C('GE-FYS'), C('EXPOS-UA 1'), LANGUAGE,
  C('GE-PS'), C('GE-LS'), C('GE-TI'), C('GE-CC'), C('GE-SSS'), C('GE-EC'));

const CS_ENTRY = CH('csentry', 'Entry into CSCI-UA 101',
  'CSCI-UA 2 and 3 do not count toward the major except as prerequisite. A score of 3 on AP Computer Science A, or the department placement test, replaces them.', [
    OPT('CSCI-UA 2, no prior programming', C('CSCI-UA 2')),
    OPT('CSCI-UA 3, some prior programming', C('CSCI-UA 3')),
    OPT('AP credit or placement test')
  ]);

const DEGREES = {
  'econcs': {
    name: 'Economics and Computer Science (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    source: 'bulletins.nyu.edu · Economics and Computer Science (BA)',
    note: 'The Bulletin table assumes AP or equivalent credit for either Macroeconomics or Microeconomics. Without it the degree takes 132 credits rather than 128.',
    tree: G('Economics and Computer Science (BA)',
      GENED_ECONCS,
      G('Economics (32 credits)',
        CH('introecon', 'Introductory Economics',
           'The major requires both, but the Bulletin plan assumes AP credit covers one of them. Choosing to take both is what pushes the degree to 132 credits.', [
             OPT('AP credit for one, take the other', C('ECON-UA 2')),
             OPT('No AP credit, take both (132-credit degree)', C('ECON-UA 1'), C('ECON-UA 2'))
           ]),
        C('ECON-UA 11'), C('ECON-UA 13'), C('ECON-UA 266'),
        CH('stats', 'Statistics requirement',
           'Taking the MATH-UA 334 option requires one additional economics elective, two in total.', [
             OPT('ECON-UA 20 Analytical Statistics', C('ECON-UA 20')),
             OPT('MATH-UA 334 Mathematical Statistics', C('MATH-UA 334'))
           ]),
        SL('econ300', 'ECON300', 2),
        SL('econextra', 'ECON300', 1)),
      G('Computer Science (36 credits)',
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'),
        C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('cs400', 'CS400', 4)),
      G('Mathematics (16 credits)',
        C('MATH-UA 120'), C('MATH-UA 131'), C('MATH-UA 132'), C('MATH-UA 133')))
  },

  'cs': {
    name: 'Computer Science (BA)',
    school: 'College of Arts and Science',
    totalCredits: 128,
    source: 'bulletins.nyu.edu · Computer Science (BA)',
    note: 'The major itself is twelve 4-credit courses. CSCI-UA 2 counts toward the degree but not toward the major, serving only as prerequisite to CSCI-UA 101.',
    tree: G('Computer Science (BA)',
      GENED_CS,
      G('Computer Science',
        CS_ENTRY,
        C('CSCI-UA 101'), C('CSCI-UA 102'), C('CSCI-UA 201'),
        C('CSCI-UA 202'), C('CSCI-UA 310'),
        SL('cs400', 'CS400', 5)),
      G('Mathematics',
        C('MATH-UA 120'),
        CH('mathseq', 'Calculus track',
           'The Bulletin states the Calculus and Mathematics for Economics sequences are mutually exclusive and cannot be mixed.', [
             OPT('MATH-UA 121 Calculus I', C('MATH-UA 121')),
             OPT('MATH-UA 131 Mathematics for Economics I', C('MATH-UA 131'))
           ])))
  }
};
