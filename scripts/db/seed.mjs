import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const host = process.env.DB_HOST ?? 'localhost';
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME ?? 'staffy';

// Seed data
const companiesData = [
  { name: 'TechStart Solutions', initials: 'TSS', category: 'Tecnología e Innovación', description: 'Empresa tecnológica innovadora enfocada en desarrollo de software y soluciones digitales.', location: 'San Francisco, CA', phone: '(555) 111-1111', website: 'www.techstart.com' },
  { name: 'GreenEnergy Corp', initials: 'GEC', category: 'Acción Ambiental', description: 'Líder en iniciativas de energía renovable y sostenibilidad.', location: 'Berkeley, CA', phone: '(555) 222-2222', website: 'www.greenenergy.com' },
  { name: 'HealthCare Innovations', initials: 'HCI', category: 'Apoyo en Salud', description: 'Brinda soluciones de salud y programas de bienestar comunitario.', location: 'Oakland, CA', phone: '(555) 333-3333', website: 'www.hcinnovations.com' },
  { name: 'Education Forward', initials: 'EF', category: 'Educación y Mentoría', description: 'Impulsa a estudiantes a través de programas educativos innovadores.', location: 'San Jose, CA', phone: '(555) 444-4444', website: 'www.educationforward.com' },
  { name: 'Community Care Network', initials: 'CCN', category: 'Impacto Social', description: 'Apoya a comunidades vulnerables mediante diversos programas de atención.', location: 'Palo Alto, CA', phone: '(555) 555-5555', website: 'www.communitycareenet.com' },
  { name: 'Wildlife Protection Alliance', initials: 'WPA', category: 'Acción Ambiental', description: 'Dedicada a proteger la vida silvestre y los hábitats naturales.', location: 'Santa Cruz, CA', phone: '(555) 666-6666', website: 'www.wildlifepa.com' },
  { name: 'Urban Development Initiative', initials: 'UDI', category: 'Organización de Eventos', description: 'Construye comunidades urbanas sostenibles e inclusivas.', location: 'San Francisco, CA', phone: '(555) 777-7777', website: 'www.urbandev.com' },
  { name: 'Arts & Culture Foundation', initials: 'ACF', category: 'Proyectos Creativos', description: 'Impulsa el arte, la cultura y la expresión creativa en la comunidad.', location: 'Oakland, CA', phone: '(555) 888-8888', website: 'www.artsculture.com' },
  { name: 'Youth Empowerment Project', initials: 'YEP', category: 'Educación y Mentoría', description: 'Fortalece a la juventud mediante mentoría y desarrollo de habilidades.', location: 'San Jose, CA', phone: '(555) 999-9999', website: 'www.youthempower.com' },
  { name: 'Disaster Relief Coalition', initials: 'DRC', category: 'Infraestructura y Mantenimiento', description: 'Responde con rapidez a desastres y crisis humanitarias.', location: 'Stockton, CA', phone: '(555) 101-0101', website: 'www.disasterrelief.com' },
];

const opportunityTitlesEs = {
  'TechStart Solutions': [
    'Apoyo en desarrollo web',
    'Pruebas de calidad',
    'Apoyo en diseño UX/UI',
    'Voluntariado de soporte técnico',
    'Documentación de software',
  ],
  'GreenEnergy Corp': [
    'Apoyo en instalación de paneles solares',
    'Educación ambiental',
    'Difusión sobre energías renovables',
    'Asesoría en sostenibilidad',
    'Coordinación de eventos ecológicos',
  ],
  'HealthCare Innovations': [
    'Asistente de atención a pacientes',
    'Facilitador de talleres de salud',
    'Organización de expedientes médicos',
    'Jornada comunitaria de salud',
    'Coordinación de programas de bienestar',
  ],
  'Education Forward': [
    'Tutoría para estudiantes',
    'Apoyo en desarrollo curricular',
    'Organización de eventos educativos',
    'Asistente de aula',
    'Facilitación de mentorías',
  ],
  'Community Care Network': [
    'Acompañamiento a personas mayores',
    'Apoyo en distribución de alimentos',
    'Trabajo de apoyo comunitario',
    'Asistente de logística de eventos',
    'Coordinación de paquetes de ayuda',
  ],
  'Wildlife Protection Alliance': [
    'Voluntariado para restauración de hábitats',
    'Apoyo en monitoreo de fauna',
    'Educación para la conservación',
    'Mantenimiento de refugios naturales',
    'Apoyo en investigación ambiental',
  ],
  'Urban Development Initiative': [
    'Construcción de huertos comunitarios',
    'Embellecimiento de barrios',
    'Mantenimiento de infraestructura',
    'Apoyo en eventos de planeación urbana',
    'Coordinación de participación comunitaria',
  ],
  'Arts & Culture Foundation': [
    'Apoyo en talleres de arte',
    'Coordinación del montaje de exposiciones',
    'Apoyo en eventos culturales',
    'Asistencia en enseñanza creativa',
    'Guía de recorridos por galerías',
  ],
  'Youth Empowerment Project': [
    'Mentoría para jóvenes',
    'Capacitación en habilidades',
    'Coordinación de eventos',
    'Apoyo a programas de mentoría',
    'Apoyo en defensa de la juventud',
  ],
  'Disaster Relief Coalition': [
    'Voluntariado de apoyo en emergencias',
    'Apoyo en distribución de suministros',
    'Educación para preparación ante desastres',
    'Asistente de recuperación comunitaria',
    'Coordinación de respuesta a desastres',
  ],
};

const opportunityDescriptions = [
  'Buscamos personas comprometidas para generar un impacto positivo en nuestra comunidad. Tu aporte será valioso y significativo.',
  'Únete a nuestro equipo y ayúdanos a servir a quienes más lo necesitan. Es una gran oportunidad para desarrollar nuevas habilidades mientras marcas la diferencia.',
  '¡Forma parte de algo más grande! El voluntariado es esencial para cumplir nuestra misión de crear un cambio positivo.',
  'Tu apoyo y entusiasmo pueden cambiar vidas. Ayúdanos a alcanzar nuestras metas y a servir mejor a nuestra comunidad.',
  'Invitamos a personas apasionadas a unirse a nuestro equipo de voluntariado y contribuir a nuestro trabajo importante.',
];

const opportunityCategoryData = [
  'Tecnología e Innovación',
  'Acción Ambiental',
  'Apoyo en Salud',
  'Educación y Mentoría',
  'Organización de Eventos',
  'Apoyo Administrativo',
  'Proyectos Creativos',
  'Impacto Social',
  'Infraestructura y Mantenimiento',
];

function buildOpportunityRequirements(category) {
  switch (category) {
    case 'Tecnología e Innovación':
      return ['Conocimientos básicos de HTML y CSS', 'Experiencia con JavaScript', 'Trabajo en equipo', 'Actitud de aprendizaje'];
    case 'Acción Ambiental':
      return ['Interés por el cuidado del medio ambiente', 'Trabajo al aire libre', 'Compromiso con la sostenibilidad', 'Trabajo en equipo'];
    case 'Apoyo en Salud':
      return ['Trato empático', 'Confidencialidad', 'Comunicación clara', 'Responsabilidad'];
    case 'Educación y Mentoría':
      return ['Paciencia', 'Habilidad para explicar ideas', 'Gusto por enseñar', 'Compromiso'];
    case 'Organización de Eventos':
      return ['Organización', 'Comunicación', 'Puntualidad', 'Flexibilidad'];
    case 'Apoyo Administrativo':
      return ['Atención al detalle', 'Manejo básico de computadora', 'Organización', 'Responsabilidad'];
    case 'Proyectos Creativos':
      return ['Creatividad', 'Trabajo colaborativo', 'Apertura a recibir retroalimentación', 'Compromiso'];
    case 'Impacto Social':
      return ['Empatía', 'Comunicación respetuosa', 'Compromiso social', 'Trabajo en equipo'];
    case 'Infraestructura y Mantenimiento':
      return ['Condición física adecuada', 'Seguridad primero', 'Trabajo en equipo', 'Responsabilidad'];
    default:
      return ['Trabajo en equipo', 'Responsabilidad', 'Ganas de aprender', 'Actitud positiva'];
  }
}

function buildOpportunityResponsibilities(category) {
  switch (category) {
    case 'Tecnología e Innovación':
      return [
        'Apoyar en tareas técnicas asignadas',
        'Colaborar con el equipo de desarrollo',
        'Probar funcionalidades y reportar incidencias',
        'Documentar avances y cambios',
        'Participar en sesiones de seguimiento',
      ];
    case 'Acción Ambiental':
      return [
        'Apoyar en actividades de campo',
        'Promover buenas prácticas ambientales',
        'Colaborar en campañas de sensibilización',
        'Registrar avances de la jornada',
        'Mantener una comunicación clara con el equipo',
      ];
    case 'Apoyo en Salud':
      return [
        'Apoyar en tareas de acompañamiento',
        'Colaborar con el personal responsable',
        'Mantener la confidencialidad de la información',
        'Asegurar un trato respetuoso',
        'Seguir los protocolos del programa',
      ];
    case 'Educación y Mentoría':
      return [
        'Apoyar a estudiantes o participantes',
        'Preparar materiales cuando sea necesario',
        'Dar seguimiento al progreso de cada actividad',
        'Fomentar un ambiente de confianza',
        'Compartir observaciones con el equipo',
      ];
    case 'Organización de Eventos':
      return [
        'Apoyar en la logística del evento',
        'Recibir y orientar a las personas asistentes',
        'Mantener orden en las áreas asignadas',
        'Colaborar con el equipo de coordinación',
        'Resolver necesidades básicas durante la jornada',
      ];
    case 'Apoyo Administrativo':
      return [
        'Organizar información y documentos',
        'Apoyar en tareas de captura de datos',
        'Dar seguimiento a pendientes administrativos',
        'Mantener el orden del espacio de trabajo',
        'Comunicar avances de forma oportuna',
      ];
    case 'Proyectos Creativos':
      return [
        'Colaborar en el desarrollo de piezas creativas',
        'Apoyar en la preparación de materiales',
        'Participar en sesiones de lluvia de ideas',
        'Cuidar la presentación visual de los proyectos',
        'Aportar ideas para mejorar la experiencia',
      ];
    case 'Impacto Social':
      return [
        'Brindar apoyo directo a la comunidad',
        'Colaborar con actividades de acompañamiento',
        'Apoyar en la organización de recursos',
        'Mantener una actitud empática y respetuosa',
        'Reportar cualquier necesidad al equipo responsable',
      ];
    case 'Infraestructura y Mantenimiento':
      return [
        'Apoyar en tareas de mantenimiento general',
        'Cuidar el uso correcto de herramientas y materiales',
        'Seguir instrucciones de seguridad',
        'Colaborar con el equipo en las labores asignadas',
        'Mantener el área limpia y ordenada',
      ];
    default:
      return [
        'Apoyar en las tareas asignadas',
        'Participar en las actividades programadas',
        'Colaborar con el equipo',
        'Comunicar avances de forma clara',
        'Seguir las indicaciones de la organización',
      ];
  }
}

const volunteerProfiles = [
  { name: 'Alex Johnson', email: 'alex.johnson@email.com' },
  { name: 'Maria Garcia', email: 'maria.garcia@email.com' },
  { name: 'David Chen', email: 'david.chen@email.com' },
  { name: 'Sofia Patel', email: 'sofia.patel@email.com' },
  { name: 'James Wilson', email: 'james.wilson@email.com' },
  { name: 'Emma Rodriguez', email: 'emma.rodriguez@email.com' },
  { name: 'Michael Brown', email: 'michael.brown@email.com' },
  { name: 'Lisa Kim', email: 'lisa.kim@email.com' },
  { name: 'Robert Taylor', email: 'robert.taylor@email.com' },
  { name: 'Anna Martinez', email: 'anna.martinez@email.com' },
  { name: 'Carlos Lopez', email: 'carlos.lopez@email.com' },
  { name: 'Jessica White', email: 'jessica.white@email.com' },
  { name: 'Christopher Lee', email: 'christopher.lee@email.com' },
  { name: 'Michelle Harris', email: 'michelle.harris@email.com' },
  { name: 'Daniel Davis', email: 'daniel.davis@email.com' },
];

async function seedDatabase() {
  let pool;
  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('Iniciando la carga de datos...\n');

    await pool.query('DELETE FROM opportunity_tags');
    await pool.query('DELETE FROM opportunity_responsibilities');
    await pool.query('DELETE FROM opportunity_requirements');
    await pool.query('DELETE FROM opportunities');

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Insert company users
    console.log('Creando perfiles de empresa...');
    const companyEmails = [];
    for (let i = 0; i < companiesData.length; i++) {
      const company = companiesData[i];
      const email = `${company.name.toLowerCase().replace(/\s+/g, '.')}@company.com`;
      companyEmails.push(email);

      await pool.query(
        'INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [company.name, email, hashedPassword, 'empresa'],
      );

      // Create profile for company user
      await pool.query(
        'INSERT IGNORE INTO user_profiles (user_email, phone, location, bio) VALUES (?, ?, ?, ?)',
        [
          email,
          `(555) ${String(i + 1).padStart(3, '0')}-0000`,
          company.location,
          `Cuenta oficial de ${company.name}. ${company.description}`,
        ],
      );
    }
    console.log(`Se crearon ${companiesData.length} usuarios empresa\n`);

    // Insert admin user
    console.log('Creando usuario administrador...');
    const adminEmail = 'admin@staffy.com';
    await pool.query(
      'INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Administrador Staffy', adminEmail, hashedPassword, 'admin'],
    );

    // Create profile for admin user
    await pool.query(
      'INSERT IGNORE INTO user_profiles (user_email, phone, location, bio) VALUES (?, ?, ?, ?)',
      [
        adminEmail,
        '(555) 000-0000',
        'San Francisco, CA',
        'Cuenta administrativa de la plataforma Staffy.',
      ],
    );
    console.log('Se creó el usuario administrador\n');

    // Insert volunteer users
    console.log('Creando perfiles de voluntariado...');
    for (let i = 0; i < volunteerProfiles.length; i++) {
      const volunteer = volunteerProfiles[i];
      await pool.query(
        'INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [volunteer.name, volunteer.email, hashedPassword, 'voluntario'],
      );

      // Create profile for volunteer
      await pool.query(
        'INSERT IGNORE INTO user_profiles (user_email, phone, location, bio) VALUES (?, ?, ?, ?)',
        [
          volunteer.email,
          `(555) ${String(i + 100).padStart(3, '0')}-0000`,
          'San Francisco, CA',
          'Voluntariado comprometido para marcar una diferencia en la comunidad.',
        ],
      );
    }
    console.log(`Se crearon ${volunteerProfiles.length} usuarios voluntarios\n`);

    // Insert organizations
    console.log('Creando organizaciones...');
    const organizationMap = {};
    for (let i = 0; i < companiesData.length; i++) {
      const company = companiesData[i];
      const email = `${company.name.toLowerCase().replace(/\s+/g, '.')}@company.com`;

      // First, check if organization already exists by name
      const [[existing]] = await pool.query('SELECT id, email FROM organizations WHERE name = ? LIMIT 1', [company.name]);
      
      if (existing) {
        // Organization exists, update email if different
        if (existing.email !== email) {
          await pool.query('UPDATE organizations SET email = ? WHERE id = ?', [email, existing.id]);
        }
        organizationMap[company.name] = existing.id;
      } else {
        // Create new organization
        try {
          await pool.query(
            `INSERT INTO organizations (initials, name, category, description, location, email, phone, website, verified, email_notifications, public_profile, auto_approve_applications, show_volunteer_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 0, 1)`,
            [
              company.initials,
              company.name,
              company.category,
              company.description,
              company.location,
              email,
              company.phone,
              company.website,
            ],
          );
          const [[org]] = await pool.query('SELECT id FROM organizations WHERE name = ? LIMIT 1', [company.name]);
          organizationMap[company.name] = org.id;
        } catch (err) {
          console.error(`    Failed to create organization: ${company.name}`, err.message);
          throw err;
        }
      }
    }
    console.log(`Se crearon ${companiesData.length} organizaciones\n`);

    // Insert opportunities for each organization
    console.log('Creando oportunidades...');
    let opportunityCount = 0;
    for (const company of companiesData) {
      const orgId = organizationMap[company.name];
      const titles = opportunityTitlesEs[company.name] || ['Oportunidad de voluntariado'];

      for (let i = 0; i < 5; i++) {
        const title = titles[i] || `${company.name} - Oportunidad ${i + 1}`;
        const category = opportunityCategoryData[Math.floor(Math.random() * opportunityCategoryData.length)];
        const description =
          opportunityDescriptions[Math.floor(Math.random() * opportunityDescriptions.length)];

        const [result] = await pool.query(
          `INSERT INTO opportunities (organization_id, title, category, image_url, opportunity_date, time_and_duration, location, availability_text, registered, total_spots, about) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            orgId,
            title,
            category,
            'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&h=420&fit=crop',
            '2026-05-01',
            '9:00 AM · 4 hours',
            company.location,
            '5 spots available',
            5,
            description,
          ],
        );

        const opportunityId = result.insertId;

        // Insert requirements
        const requirements = buildOpportunityRequirements(category);
        for (const requirement of requirements) {
          await pool.query(
            'INSERT IGNORE INTO opportunity_requirements (opportunity_id, requirement_text) VALUES (?, ?)',
            [opportunityId, requirement],
          );
        }

        // Insert responsibilities
        const responsibilities = buildOpportunityResponsibilities(category);
        for (const responsibility of responsibilities) {
          await pool.query(
            'INSERT IGNORE INTO opportunity_responsibilities (opportunity_id, responsibility_text) VALUES (?, ?)',
            [opportunityId, responsibility],
          );
        }

        // Insert tags (skills)
        const tags = [
          'Trabajo en equipo',
          'Comunicación',
          'Resolución de problemas',
          category,
          i % 2 === 0 ? 'Liderazgo' : 'Apoyo',
        ];
        for (const tag of tags) {
          await pool.query(
            'INSERT IGNORE INTO opportunity_tags (opportunity_id, tag_name) VALUES (?, ?)',
            [opportunityId, tag],
          );
        }

        opportunityCount++;
      }
    }
    console.log(`Se crearon ${opportunityCount} oportunidades (5 por empresa)\n`);

    console.log('Carga de datos completada.\n');
    console.log('Resumen:');
    console.log(`   • ${companiesData.length} usuarios empresa creados`);
    console.log(`   • ${volunteerProfiles.length} usuarios voluntarios creados`);
    console.log(`   • ${companiesData.length} organizaciones creadas`);
    console.log(`   • ${opportunityCount} oportunidades creadas (5 por empresa)`);
    console.log(`\nTodas las cuentas pueden iniciar sesión con la contraseña: Password123!`);
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

seedDatabase();
