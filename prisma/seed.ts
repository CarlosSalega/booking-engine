/* eslint-disable no-console */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { PaymentCreateManyInput } from "@/generated/prisma/models/Payment";

/**
 * Modular seed script.
 *
 * Idempotent: re-running wipes business-domain data first (children before
 * parents) and then re-inserts the same fixture. Auth tables (User, Session,
 * Account, Verification) are also wiped to keep fixture data isolated.
 *
 * The Prisma client is created locally (rather than reusing the Next.js
 * singleton at `src/lib/prisma.ts`) because this script runs as a standalone
 * Node process via `tsx` — no Next.js runtime, no HMR global.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] }),
});

const ORG_ID = "00000000-0000-4000-8000-000000000001";

const PASSWORD_HASH =
  "a70492f2b0e8683f2487243105c2634d:80af416fe3111ed6cf659c96470b0b849d51207daf922f7d0a6f7f0beff8267da1fbfcc16c8ab3f0cf05c45f1b791fbe1815bcfb3ad48adbfbb6d852b0980839"; // password123 (scrypt N=16384 r=16 p=1 dkLen=64)

async function cleanDatabase(): Promise<void> {
  // Order matters: delete children before parents to satisfy FK constraints.
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}

function daysFromNow(days: number, hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function plusMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

interface SeedUsers {
  admin: string;
  secretary: string;
  drGarcia: string;
  draLopez: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  p5: string;
}

async function seedUsers(): Promise<SeedUsers> {
  const rows = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ana Administradora",
        email: "admin@clinica.com",
        role: "ADMIN",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sofía Secretaria",
        email: "secretaria@clinica.com",
        role: "SECRETARY",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Martín García",
        email: "dra.garcia@clinica.com",
        role: "PROFESSIONAL",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Carlos Martínez",
        email: "dr.martinez@clinica.com",
        role: "PROFESSIONAL",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Juan Pérez",
        email: "juan.perez@example.com",
        role: "PATIENT",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "María Rodríguez",
        email: "maria.rodriguez@example.com",
        role: "PATIENT",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Carlos Fernández",
        email: "carlos.fernandez@example.com",
        role: "PATIENT",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Lucía Martínez",
        email: "lucia.martinez@example.com",
        role: "PATIENT",
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Diego Sánchez",
        email: "diego.sanchez@example.com",
        role: "PATIENT",
        emailVerified: true,
      },
    }),
  ]);

  // Create a credential Account for each user so Better Auth's email/password
  // flow could (in theory) sign them in. The hash is a placeholder and will
  // NOT match any real password.
  await prisma.account.createMany({
    data: rows.map((u) => ({
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: PASSWORD_HASH,
    })),
  });

  return {
    admin: rows[0]!.id,
    secretary: rows[1]!.id,
    drGarcia: rows[2]!.id,
    draLopez: rows[3]!.id,
    p1: rows[4]!.id,
    p2: rows[5]!.id,
    p3: rows[6]!.id,
    p4: rows[7]!.id,
    p5: rows[8]!.id,
  };
}

interface SeedProfessionals {
  drGarcia: string;
  draLopez: string;
}

async function seedProfessionals(users: SeedUsers): Promise<SeedProfessionals> {
  const garcia = await prisma.professional.create({
    data: {
      organizationId: ORG_ID,
      userId: users.drGarcia,
      status: "ACTIVE",
      specialties: ["Odontología General", "Endodoncia"],
      license: "MN 12345",
      bio: "Odontólogo con 12 años de experiencia en atención clínica general.",
    },
  });
  const lopez = await prisma.professional.create({
    data: {
      organizationId: ORG_ID,
      userId: users.draLopez,
      status: "ACTIVE",
      specialties: ["Ortodoncia", "Estética Dental"],
      license: "MN 67890",
      bio: "Especialista en ortodoncia y estética, enfocada en tratamientos largos.",
    },
  });
  return { drGarcia: garcia.id, draLopez: lopez.id };
}

interface SeedPatients {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  p5: string;
}

async function seedPatients(users: SeedUsers): Promise<SeedPatients> {
  const [p1, p2, p3, p4, p5] = await Promise.all([
    prisma.patient.create({
      data: {
        organizationId: ORG_ID,
        userId: users.p1,
        status: "ACTIVE",
        phone: "+54 11 5555-1001",
        address: "Av. Corrientes 1234, CABA",
        dateOfBirth: new Date("1985-04-12"),
        notes: "Paciente regular, sin alergias conocidas.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: ORG_ID,
        userId: users.p2,
        status: "ACTIVE",
        phone: "+54 11 5555-1002",
        address: "Av. Santa Fe 2345, CABA",
        dateOfBirth: new Date("1990-09-23"),
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: ORG_ID,
        userId: users.p3,
        status: "ACTIVE",
        phone: "+54 11 5555-1003",
        address: "Belgrano 567, CABA",
        dateOfBirth: new Date("1978-01-30"),
        notes: "Tratamiento de ortodoncia en curso.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: ORG_ID,
        userId: users.p4,
        status: "ACTIVE",
        phone: "+54 11 5555-1004",
        address: "Caballito 890, CABA",
        dateOfBirth: new Date("2000-07-15"),
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: ORG_ID,
        userId: users.p5,
        status: "BLOCKED",
        phone: "+54 11 5555-1005",
        address: "Palermo 432, CABA",
        dateOfBirth: new Date("1995-11-02"),
        notes: "Bloqueado por reiteradas inasistencias.",
      },
    }),
  ]);
  return { p1: p1.id, p2: p2.id, p3: p3.id, p4: p4.id, p5: p5.id };
}

interface SeedServices {
  consultaGeneral: string;
  limpieza: string;
  blanqueamiento: string;
  ortodonciaControl: string;
  endodoncia: string;
  extraccion: string;
  implanteConsulta: string;
  urgencia: string;
}

async function seedServices(
  professionals: SeedProfessionals,
): Promise<SeedServices> {
  // 6-8 services, split across the two professionals, mixed payment types.
  const created = await Promise.all([
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Consulta General",
        description: "Evaluación clínica inicial y plan de tratamiento.",
        durationMinutes: 30,
        price: 2000,
        paymentType: "NONE",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Limpieza Dental",
        description: "Profilaxis completa con ultrasonido y pulido.",
        durationMinutes: 45,
        price: 3500,
        paymentType: "FULL",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Blanqueamiento",
        description: "Blanqueamiento dental profesional en consultorio.",
        durationMinutes: 60,
        price: 8000,
        paymentType: "DEPOSIT",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.draLopez,
        name: "Ortodoncia - Control",
        description: "Control mensual de tratamiento de ortodoncia.",
        durationMinutes: 30,
        price: 2500,
        paymentType: "NONE",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Endodoncia",
        description: "Tratamiento de conducto en una sesión.",
        durationMinutes: 90,
        price: 12000,
        paymentType: "DEPOSIT",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Extracción",
        description: "Extracción simple de pieza dentaria.",
        durationMinutes: 45,
        price: 5000,
        paymentType: "FULL",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.draLopez,
        name: "Implante - Consulta",
        description: "Evaluación y planificación de implante.",
        durationMinutes: 30,
        price: 3000,
        paymentType: "FULL",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: ORG_ID,
        professionalId: professionals.drGarcia,
        name: "Urgencia",
        description: "Atención de urgencia por dolor o fractura.",
        durationMinutes: 30,
        price: 4000,
        paymentType: "FULL",
        paymentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
  ]);
  return {
    consultaGeneral: created[0]!.id,
    limpieza: created[1]!.id,
    blanqueamiento: created[2]!.id,
    ortodonciaControl: created[3]!.id,
    endodoncia: created[4]!.id,
    extraccion: created[5]!.id,
    implanteConsulta: created[6]!.id,
    urgencia: created[7]!.id,
  };
}

interface SeedBookings {
  byKey: Record<string, string>;
  byService: Record<keyof SeedServices, string[]>;
}

async function seedBookings(
  patients: SeedPatients,
  professionals: SeedProfessionals,
  services: SeedServices,
): Promise<SeedBookings> {
  // 20 bookings spread across ±7 days. Status mix:
  //   - past: COMPLETED, NO_SHOW, CANCELLED
  //   - present/future: CONFIRMED, PENDING, AWAITING_PAYMENT
  // Plus 2 guest bookings (patientId: null) for development testing.
  type Spec = {
    key: string;
    days: number;
    hour: number;
    minute?: number;
    durationMinutes: number;
    patientId: string | null;
    professionalId: string;
    serviceId: string;
    status: string;
    notes?: string;
  };

  const specs: Spec[] = [
    // --- Past ---
    {
      key: "b-consulta-past-completed",
      days: -6,
      hour: 9,
      durationMinutes: 30,
      patientId: patients.p1,
      professionalId: professionals.drGarcia,
      serviceId: services.consultaGeneral,
      status: "COMPLETED",
    },
    {
      key: "b-limpieza-past-completed",
      days: -5,
      hour: 10,
      durationMinutes: 45,
      patientId: patients.p2,
      professionalId: professionals.drGarcia,
      serviceId: services.limpieza,
      status: "COMPLETED",
    },
    {
      key: "b-orto-past-completed",
      days: -4,
      hour: 16,
      durationMinutes: 30,
      patientId: patients.p3,
      professionalId: professionals.draLopez,
      serviceId: services.ortodonciaControl,
      status: "COMPLETED",
    },
    {
      key: "b-extraccion-past-cancelled",
      days: -3,
      hour: 11,
      durationMinutes: 45,
      patientId: patients.p4,
      professionalId: professionals.drGarcia,
      serviceId: services.extraccion,
      status: "CANCELLED",
      notes: "Cancelado por el paciente con 24h de anticipación.",
    },
    {
      key: "b-consulta-past-noshow",
      days: -2,
      hour: 15,
      durationMinutes: 30,
      patientId: patients.p5,
      professionalId: professionals.drGarcia,
      serviceId: services.consultaGeneral,
      status: "NO_SHOW",
    },
    {
      key: "b-implante-past-completed",
      days: -1,
      hour: 17,
      durationMinutes: 30,
      patientId: patients.p1,
      professionalId: professionals.draLopez,
      serviceId: services.implanteConsulta,
      status: "COMPLETED",
    },
    // --- Today (day 0) ---
    {
      key: "b-limpieza-today-confirmed",
      days: 0,
      hour: 9,
      minute: 30,
      durationMinutes: 45,
      patientId: patients.p2,
      professionalId: professionals.drGarcia,
      serviceId: services.limpieza,
      status: "CONFIRMED",
    },
    {
      key: "b-orto-today-confirmed",
      days: 0,
      hour: 12,
      durationMinutes: 30,
      patientId: patients.p3,
      professionalId: professionals.draLopez,
      serviceId: services.ortodonciaControl,
      status: "CONFIRMED",
    },
    // --- Future ---
    {
      key: "b-consulta-future-pending",
      days: 1,
      hour: 10,
      durationMinutes: 30,
      patientId: patients.p1,
      professionalId: professionals.drGarcia,
      serviceId: services.consultaGeneral,
      status: "PENDING",
    },
    {
      key: "b-blanqueamiento-future-awaiting",
      days: 1,
      hour: 14,
      durationMinutes: 60,
      patientId: patients.p4,
      professionalId: professionals.drGarcia,
      serviceId: services.blanqueamiento,
      status: "AWAITING_PAYMENT",
    },
    {
      key: "b-endodoncia-future-awaiting",
      days: 2,
      hour: 9,
      durationMinutes: 90,
      patientId: patients.p2,
      professionalId: professionals.drGarcia,
      serviceId: services.endodoncia,
      status: "AWAITING_PAYMENT",
    },
    {
      key: "b-implante-future-pending",
      days: 2,
      hour: 15,
      durationMinutes: 30,
      patientId: patients.p3,
      professionalId: professionals.draLopez,
      serviceId: services.implanteConsulta,
      status: "PENDING",
    },
    {
      key: "b-extraccion-future-confirmed",
      days: 3,
      hour: 11,
      durationMinutes: 45,
      patientId: patients.p1,
      professionalId: professionals.drGarcia,
      serviceId: services.extraccion,
      status: "CONFIRMED",
    },
    {
      key: "b-orto-future-confirmed",
      days: 3,
      hour: 16,
      durationMinutes: 30,
      patientId: patients.p4,
      professionalId: professionals.draLopez,
      serviceId: services.ortodonciaControl,
      status: "CONFIRMED",
    },
    {
      key: "b-urgencia-future-pending",
      days: 4,
      hour: 8,
      durationMinutes: 30,
      patientId: patients.p5,
      professionalId: professionals.drGarcia,
      serviceId: services.urgencia,
      status: "PENDING",
    },
    {
      key: "b-limpieza-future-confirmed",
      days: 5,
      hour: 10,
      durationMinutes: 45,
      patientId: patients.p2,
      professionalId: professionals.drGarcia,
      serviceId: services.limpieza,
      status: "CONFIRMED",
    },
    {
      key: "b-consulta-future-confirmed",
      days: 5,
      hour: 17,
      durationMinutes: 30,
      patientId: patients.p3,
      professionalId: professionals.drGarcia,
      serviceId: services.consultaGeneral,
      status: "CONFIRMED",
    },
    {
      key: "b-orto-future-confirmed-2",
      days: 6,
      hour: 12,
      durationMinutes: 30,
      patientId: patients.p1,
      professionalId: professionals.draLopez,
      serviceId: services.ortodonciaControl,
      status: "CONFIRMED",
    },
    {
      key: "b-blanqueamiento-future-pending",
      days: 6,
      hour: 14,
      durationMinutes: 60,
      patientId: patients.p4,
      professionalId: professionals.drGarcia,
      serviceId: services.blanqueamiento,
      status: "PENDING",
    },
    {
      key: "b-implante-future-pending-2",
      days: 7,
      hour: 9,
      durationMinutes: 30,
      patientId: patients.p2,
      professionalId: professionals.draLopez,
      serviceId: services.implanteConsulta,
      status: "PENDING",
    },
    // --- Guest bookings (patientId: null) ---
    {
      key: "b-guest-consulta-pending",
      days: 4,
      hour: 13,
      durationMinutes: 30,
      patientId: null,
      professionalId: professionals.drGarcia,
      serviceId: services.consultaGeneral,
      status: "PENDING",
      notes: "Invitado: María Gómez | Tel: 351-9876543 | Email: maria.gomez@email.com",
    },
    {
      key: "b-guest-urgencia-confirmed",
      days: 6,
      hour: 18,
      durationMinutes: 30,
      patientId: null,
      professionalId: professionals.draLopez,
      serviceId: services.implanteConsulta,
      status: "CONFIRMED",
      notes: "Invitado: Roberto Silva | Tel: 351-5551234 | Email: roberto.silva@email.com",
    },
  ];

  const byKey: Record<string, string> = {};
  const byService: Record<keyof SeedServices, string[]> = {
    consultaGeneral: [],
    limpieza: [],
    blanqueamiento: [],
    ortodonciaControl: [],
    endodoncia: [],
    extraccion: [],
    implanteConsulta: [],
    urgencia: [],
  };

  // Reverse-lookup serviceId -> key
  const serviceKeyById: Record<string, keyof SeedServices> = {
    [services.consultaGeneral]: "consultaGeneral",
    [services.limpieza]: "limpieza",
    [services.blanqueamiento]: "blanqueamiento",
    [services.ortodonciaControl]: "ortodonciaControl",
    [services.endodoncia]: "endodoncia",
    [services.extraccion]: "extraccion",
    [services.implanteConsulta]: "implanteConsulta",
    [services.urgencia]: "urgencia",
  };

  for (const spec of specs) {
    const start = daysFromNow(spec.days, spec.hour, spec.minute ?? 0);
    const end = plusMinutes(start, spec.durationMinutes);
    const booking = await prisma.booking.create({
      data: {
        organizationId: ORG_ID,
        patientId: spec.patientId,
        professionalId: spec.professionalId,
        serviceId: spec.serviceId,
        status: spec.status,
        startTime: start,
        endTime: end,
        notes: spec.notes,
      },
    });
    byKey[spec.key] = booking.id;
    const svcKey = serviceKeyById[spec.serviceId];
    if (svcKey) byService[svcKey].push(booking.id);
  }

  return { byKey, byService };
}

async function seedPayments(bookings: SeedBookings): Promise<void> {
  // Create payments for bookings of services with paymentType != NONE.
  // Service payment types (from seedServices):
  //   - Consulta General, Ortodoncia-Control: NONE          -> no payments
  //   - Limpieza, Extracción, Implante-Consulta, Urgencia:  FULL
  //   - Blanqueamiento, Endodoncia:                          DEPOSIT
  const allPayments: PaymentCreateManyInput[] = [];

  const addFullPayment = (
    bookingId: string,
    status: string,
    amount: number,
    extra: Partial<{ preferenceId: string; externalReference: string; retryCount: number }> = {},
  ) => {
    allPayments.push({
      organizationId: ORG_ID,
      bookingId,
      provider: "MERCADOPAGO",
      status,
      amount,
      preferenceId: extra.preferenceId ?? `pref_${bookingId.slice(0, 8)}`,
      externalReference: extra.externalReference ?? `ref_${bookingId.slice(0, 8)}`,
      retryCount: extra.retryCount ?? 0,
    });
  };

  // --- FULL payment services ---
  // Limpieza
  for (const bookingId of bookings.byService.limpieza) {
    // past completed -> APPROVED; future confirmed -> APPROVED (prepaid);
    // future one -> PENDING
    addFullPayment(bookingId, "APPROVED", 3500);
  }
  // Extracción
  for (const bookingId of bookings.byService.extraccion) {
    addFullPayment(bookingId, "PENDING", 5000);
  }
  // Implante-Consulta
  for (const bookingId of bookings.byService.implanteConsulta) {
    addFullPayment(bookingId, "APPROVED", 3000);
  }
  // Urgencia
  for (const bookingId of bookings.byService.urgencia) {
    addFullPayment(bookingId, "PENDING", 4000);
  }

  // --- DEPOSIT payment services: parent (seña) + child (resto) ---
  // Blanqueamiento ($8000): parent 50% + child 50%.
  for (const bookingId of bookings.byService.blanqueamiento) {
    const parent = await prisma.payment.create({
      data: {
        organizationId: ORG_ID,
        bookingId,
        provider: "MERCADOPAGO",
        status: "APPROVED",
        amount: 4000,
        preferenceId: `pref_${bookingId.slice(0, 8)}_seña`,
        externalReference: `ref_${bookingId.slice(0, 8)}_seña`,
        retryCount: 0,
      },
    });
    await prisma.payment.create({
      data: {
        organizationId: ORG_ID,
        bookingId,
        provider: "MERCADOPAGO",
        status: "PENDING",
        amount: 4000,
        preferenceId: `pref_${bookingId.slice(0, 8)}_resto`,
        externalReference: `ref_${bookingId.slice(0, 8)}_resto`,
        retryCount: 0,
        parentPaymentId: parent.id,
      },
    });
  }

  // Endodoncia ($12000): parent seña APPROVED + child restante REJECTED
  // (with retryCount = 1) to exercise the failed-retries branch.
  for (const bookingId of bookings.byService.endodoncia) {
    const parent = await prisma.payment.create({
      data: {
        organizationId: ORG_ID,
        bookingId,
        provider: "MERCADOPAGO",
        status: "APPROVED",
        amount: 6000,
        preferenceId: `pref_${bookingId.slice(0, 8)}_seña`,
        externalReference: `ref_${bookingId.slice(0, 8)}_seña`,
        retryCount: 0,
      },
    });
    await prisma.payment.create({
      data: {
        organizationId: ORG_ID,
        bookingId,
        provider: "MERCADOPAGO",
        status: "REJECTED",
        amount: 6000,
        preferenceId: `pref_${bookingId.slice(0, 8)}_resto`,
        externalReference: `ref_${bookingId.slice(0, 8)}_resto`,
        retryCount: 1,
        parentPaymentId: parent.id,
      },
    });
  }

  // Persist the FULL-payments batch collected above.
  if (allPayments.length > 0) {
    await prisma.payment.createMany({ data: allPayments });
  }
}

async function main(): Promise<void> {
  console.log("Seeding database...");

  await cleanDatabase();
  console.log("  - cleaned existing data");

  const users = await seedUsers();
  console.log(`  - seeded 9 users (1 admin, 1 secretary, 2 professionals, 5 patients)`);

  const professionals = await seedProfessionals(users);
  console.log("  - seeded 2 professional records");

  const patients = await seedPatients(users);
  console.log("  - seeded 5 patient records");

  const services = await seedServices(professionals);
  console.log("  - seeded 8 services");

  const bookings =   await seedBookings(patients, professionals, services);
  console.log("  - seeded 22 bookings (20 + 2 guest bookings)");

  await seedPayments(bookings);
  console.log("  - seeded payments (FULL + DEPOSIT parent/child)");

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
