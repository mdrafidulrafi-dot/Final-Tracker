/* Starter data taken from the team-wise task list (progress/status values are estimates — adjust in the app). */
(function () {
  const T = (id, teamId, title, o) => Object.assign({
    id, teamId, title, description: '', drawing: '', responsibles: '', daysRequired: '',
    startDate: '', endDate: '', actualEnd: '', status: 'In Progress', progress: 0,
    priority: 'Normal', remarks: '', attachments: [], createdAt: '', updatedAt: '', updatedBy: ''
  }, o);

  window.SEED = {
    teams: [
      { id: 'A', name: 'Team A', supervisor: 'Abdul Latif Miah', lead: 'MD Sheikh Selim',
        members: 'Rubel Howlader\nBoloram babu\nMd.Shakil Khan\nMd.Sajim', order: 1 },
      { id: 'B', name: 'Team B', supervisor: 'Md.Omar Faruqe', lead: 'Md. Biplop Khan',
        members: 'Juyel Box\nSeikh Farid\nMd. Shamim\nFoysal Ahmed', order: 2 },
      { id: 'C', name: 'Team C', supervisor: 'Mohammad Hossain Tushar', lead: 'Mojammel',
        members: 'Md. Mannan\nMd. Apon\nMd.Jahangeer Alam\nMd. Khurshid Alam\nMd.Sultan', order: 3 },
      { id: 'D', name: 'Team D', supervisor: 'Md Mostafizur Rahman', lead: 'Md. Zilani',
        members: 'Md. Salauddin\nZuel Miah\nTapos Das\nMD Sajib Hossen', order: 4 },
      { id: 'E', name: 'Team E', supervisor: 'Support Team', lead: 'Md. Ibrahim Dewan',
        members: 'Juman Mia\nMd. Salauddin\nAfzal Dorge\nAbdur Rahman', order: 5 },
      { id: 'F', name: 'Team F', supervisor: 'Support Team', lead: 'Ataur Rahaman',
        members: 'Md. Forhad\nMd. Naeem Bagh\nMd. HM Hannan Sharif\nMd. Hazrat Ali', order: 6 }
    ],
    tasks: [
      T('T-A1', 'A', 'C9-12 Gear Coupling Alignment', { description: 'Cleaning remaining C12', responsibles: 'All',
        daysRequired: 2, startDate: '2026-09-30', endDate: '2026-10-01', status: 'In Progress', progress: 60, remarks: 'Crane needed' }),

      T('T-B1', 'B', 'Foot Valve & Foot Valve Net for roughing', { description: 'Bend completed', responsibles: 'All',
        daysRequired: 2, endDate: '2026-10-02', status: 'In Progress', progress: 70, remarks: '5 done, fitting remaining' }),
      T('T-B2', 'B', 'Foot Valve & Foot Valve Net for TMT', { description: 'Flange cutting 8 pcs (dressing & drilling)',
        endDate: '2026-10-06', status: 'In Progress', progress: 40, remarks: 'Flange making & welding within today by Faruk Bhai' }),

      T('T-C1', 'C', 'Packing Plate', { responsibles: 'All', daysRequired: 6, startDate: '2026-09-29', endDate: '2026-10-04',
        actualEnd: '2026-10-04', status: 'Completed', progress: 100, remarks: '10mm-520 pcs, 16mm-500 pcs, 20mm-520 pcs, 30mm-500 pcs' }),
      T('T-C2', 'C', 'Bend Machine Base Plate, 250X250X16', { description: '90 pcs', daysRequired: 2, startDate: '2026-10-03',
        endDate: '2026-10-04', actualEnd: '2026-10-05', status: 'In Progress', progress: 90, remarks: 'Done, now grinding running' }),
      T('T-C3', 'C', 'Coupling opening', { description: 'Crop Shear', actualEnd: '2026-10-05', status: 'Completed', progress: 100, remarks: 'Work done' }),
      T('T-C4', 'C', '16 inch pipe cutting 1 meter', { description: 'TMT Drain Line', status: 'Completed', progress: 100, remarks: 'Work done, need installation' }),
      T('T-C5', 'C', 'Support for gas line', { responsibles: 'Mannan', status: 'In Progress', progress: 30, remarks: 'Base plate making done' }),

      T('T-D1', 'D', 'Filter fitting', { daysRequired: 1, startDate: '2026-10-03', endDate: '2026-10-03', status: 'In Planning', progress: 0 }),
      T('T-D2', 'D', 'Mill Water Pump Fitting', { description: 'After curing', daysRequired: 3, startDate: '2026-10-05',
        endDate: '2026-10-07', status: 'In Progress', progress: 50, remarks: 'Work ongoing' }),

      T('T-E1', 'E', 'Electrical cable drain', { description: '2 people needed — Shah Alam, Tasin (Production); Afjal, Salauddin',
        responsibles: 'Afzal Dorge, Md. Salauddin', daysRequired: 15, status: 'In Progress', progress: 10, remarks: '10–15 days estimated' }),
      T('T-E2', 'E', 'Mill water valve cleaning (gate)', { status: 'In Progress', progress: 30, remarks: 'Running, remaining valves pending' }),

      T('T-F1', 'F', 'Bus Bar bolt check', { responsibles: 'All', actualEnd: '2026-10-05', status: 'Completed', progress: 100, remarks: 'Need support of electrical team' }),
      T('T-F2', 'F', 'Restore equipment that fell off', { status: 'In Planning', progress: 0 })
    ]
  };
})();
