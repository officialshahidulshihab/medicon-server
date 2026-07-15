import "dotenv/config";
import express, { type Express, type Request, type Response } from "express";
import { MongoClient, ObjectId, ServerApiVersion, type Db } from "mongodb";
import cors from "cors";

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 5000;
const MONGO_URI: string = process.env.MONGODB_URI || "medicon_atlas_uri_here";

app.use(
  cors({
     origin: [
      "http://localhost:3000",
      "https://medicon-three.vercel.app"
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db: Db;

const toObjectId = (id: string): ObjectId | null => {
  return ObjectId.isValid(id) && id.length === 24 ? new ObjectId(id) : null;
};

app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Medicon API is running" });
});

app.get("/doctors", async (_req: Request, res: Response) => {
  try {
    const doctors = await db
      .collection("doctors")
      .find({})
      .sort({ createdAt: -1 })
      .limit(4)
      .toArray();
    res.json(doctors);
  } catch (error) {
    console.error("Error in GET /doctors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/all-doctors", async (_req: Request, res: Response) => {
  try {
    const doctors = await db.collection("doctors").find({}).toArray();
    res.json(doctors);
  } catch (error) {
    console.error("Error in GET /all-doctors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/all-doctors/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ message: "Invalid doctor ID format" });
      return;
    }

    const result = await db.collection("doctors").findOne({ _id: objectId });

    if (!result) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error("Error in GET /all-doctors/:id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/doctors/by-user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const doctor = await db.collection("doctors").findOne({ userId });

    if (!doctor) {
      res.status(404).json({ message: "No listing found for this user." });
      return;
    }

    res.json(doctor);
  } catch (error) {
    console.error("Error in GET /doctors/by-user/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/doctors", async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      experience,
      specialty,
      location,
      hospital,
      consultationFee,
      photoUrl,
      bio,
      userId,
      qualifications,
      availableSlots,
      isAvailable,
    } = req.body;

    const missing: string[] = [];
    if (!fullName?.trim()) missing.push("fullName");
    if (!experience?.toString().trim()) missing.push("experience");
    if (!specialty?.trim()) missing.push("specialty");
    if (!location?.trim()) missing.push("location");
    if (!hospital?.trim()) missing.push("hospital");
    if (!consultationFee?.toString().trim()) missing.push("consultationFee");
    if (!bio?.trim()) missing.push("bio");
    if (!userId?.trim()) missing.push("userId");

    const cleanedQuals: string[] = Array.isArray(qualifications)
      ? qualifications.map((q: string) => q.trim()).filter(Boolean)
      : [];

    const cleanedSlots: string[] = Array.isArray(availableSlots)
      ? availableSlots.map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (missing.length > 0) {
      res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const existing = await db.collection("doctors").findOne({ userId });
    if (existing) {
      res
        .status(409)
        .json({ message: "A listing already exists for this account." });
      return;
    }

    const newDoctor = {
      userId,
      name: fullName.trim(),
      experience: Number(experience),
      specialty: specialty.trim(),
      location: location.trim(),
      hospital: hospital.trim(),
      consultationFee: Number(consultationFee),
      photo: photoUrl?.trim() || "",
      bio: bio.trim(),
      qualifications: cleanedQuals,
      availableSlots: cleanedSlots,
      isAvailable: isAvailable !== false,
      rating: 0,
      totalReviews: 0,
      totalAppointments: 0,
      verified: false,
      role: "doctor",
      createdAt: new Date(),
    };

    const result = await db.collection("doctors").insertOne(newDoctor);

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Listing published successfully.",
    });
  } catch (error) {
    console.error("Error in POST /doctors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/doctors/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ message: "Invalid doctor ID format" });
      return;
    }

    const result = await db.collection("doctors").deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }

    res.json({ success: true, message: "Listing deleted." });
  } catch (error) {
    console.error("Error in DELETE /doctors/:id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/doctors/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ message: "Invalid doctor ID format" });
      return;
    }

    const {
      fullName,
      experience,
      specialty,
      location,
      hospital,
      consultationFee,
      photoUrl,
      bio,
      qualifications,
      availableSlots,
      isAvailable,
    } = req.body;

    const missing: string[] = [];
    if (!fullName?.trim()) missing.push("fullName");
    if (!experience?.toString().trim()) missing.push("experience");
    if (!specialty?.trim()) missing.push("specialty");
    if (!location?.trim()) missing.push("location");
    if (!hospital?.trim()) missing.push("hospital");
    if (!consultationFee?.toString().trim()) missing.push("consultationFee");
    if (!bio?.trim()) missing.push("bio");

    if (missing.length > 0) {
      res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const cleanedQuals: string[] = Array.isArray(qualifications)
      ? qualifications.map((q: string) => q.trim()).filter(Boolean)
      : [];

    const cleanedSlots: string[] = Array.isArray(availableSlots)
      ? availableSlots.map((s: string) => s.trim()).filter(Boolean)
      : [];

    const result = await db.collection("doctors").updateOne(
      { _id: objectId },
      {
        $set: {
          name: fullName.trim(),
          experience: Number(experience),
          specialty: specialty.trim(),
          location: location.trim(),
          hospital: hospital.trim(),
          consultationFee: Number(consultationFee),
          photo: photoUrl?.trim() || "",
          bio: bio.trim(),
          qualifications: cleanedQuals,
          availableSlots: cleanedSlots,
          isAvailable: isAvailable !== false,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }

    res.json({ success: true, message: "Listing updated successfully." });
  } catch (error) {
    console.error("Error in PUT /doctors/:id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/review", async (_req: Request, res: Response) => {
  try {
    const reviews = await db
      .collection("review")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(reviews);
  } catch (error) {
    console.error("Error in GET /review:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get(
  "/appointments/slots/:doctorId/:date",
  async (req: Request, res: Response) => {
    try {
      const { doctorId, date } = req.params;
      const booked = await db
        .collection("appointments")
        .find({ doctorId, date, status: { $ne: "cancelled" } })
        .toArray();

      const bookedSlots = booked.map((a) => a.timeSlot);
      res.json({ bookedSlots });
    } catch (error) {
      console.error("Error in GET /appointments/slots/:doctorId/:date:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

app.get("/appointments/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const booked = await db
      .collection("appointments")
      .find({ userId })
      .toArray();

    const enriched = await Promise.all(
      booked.map(async (appt) => {
        const objectId = toObjectId(appt.doctorId);
        const doctor = objectId
          ? await db.collection("doctors").findOne({ _id: objectId })
          : null;

        return {
          ...appt,
          doctorName: doctor?.name ?? "Unknown",
          doctorPhoto: doctor?.photo ?? "",
          doctorSpecialty: doctor?.specialty ?? "",
          doctorHospital: doctor?.hospital ?? "",
          doctorRating: doctor?.rating ?? 0,
        };
      }),
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error in GET /appointments/user/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/appointments/doctor/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);

    const doctor = await db
      .collection("doctors")
      .findOne({ userId }, { projection: { _id: 1 } });

    if (!doctor) {
      res.json([]);
      return;
    }

    const doctorId = doctor._id.toString();

    const appointments = await db
      .collection("appointments")
      .find({ doctorId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const enriched = await Promise.all(
      appointments.map(async (appt) => {
        const patient = await db
          .collection("user")
          .findOne({ id: appt.userId });

        console.log("FULL patient doc:", JSON.stringify(patient));

        return {
          ...appt,
          patientName: patient?.name ?? "Unknown Patient",
          patientEmail: patient?.email ?? "",
          patientPhoto: patient?.image ?? "",
        };
      }),
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error in GET /appointments/doctor/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/appointments", async (req: Request, res: Response) => {
  try {
    const { doctorId, userId, date, timeSlot } = req.body;

    if (!doctorId || !userId || !date || !timeSlot) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    if (!ObjectId.isValid(doctorId) || doctorId.length !== 24) {
      res.status(400).json({ message: "Invalid doctorId format" });
      return;
    }

    if (!doctorId || !userId || !date || !timeSlot) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const existing = await db.collection("appointments").findOne({
      doctorId,
      date,
      timeSlot,
      status: { $ne: "cancelled" },
    });

    if (existing) {
      res.status(409).json({ message: "Slot already booked" });
      return;
    }

    const newAppointment = {
      doctorId,
      userId,
      date,
      timeSlot,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db
      .collection("appointments")
      .insertOne(newAppointment);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error in POST /appointments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/appointments/:id/cancel", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ message: "Invalid appointment ID format" });
      return;
    }

    const result = await db
      .collection("appointments")
      .updateOne({ _id: objectId }, { $set: { status: "cancelled" } });

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /appointments/:id/cancel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/appointments/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ message: "Invalid appointment ID format" });
      return;
    }

    const result = await db
      .collection("appointments")
      .updateOne(
        { _id: objectId, status: "pending" },
        { $set: { status: "confirmed" } },
      );

    if (result.matchedCount === 0) {
      res.status(404).json({
        message: "Appointment not found or is not in pending state.",
      });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /appointments/:id/confirm:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/doctor-stats/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const doctor = await db.collection("doctors").findOne({ userId });
    if (!doctor) {
      res.json({
        total: 0,
        pending: 0,
        cancelled: 0,
        completed: 0,
        totalPatients: 0,
        revenue: 0,
        rating: 0,
        consultationFee: 0,
      });
      return;
    }

    const doctorId = doctor._id.toString();
    const sampleAppt = await db.collection("appointments").findOne({});
    console.log("=== STATS DEBUG ===");
    console.log("Looking for doctorId:", doctorId);
    console.log("Sample appointment doctorId:", sampleAppt?.doctorId);
    console.log("Match?", sampleAppt?.doctorId === doctorId);

    const [total, pending, cancelled, completed, uniquePatientsResult] =
      await Promise.all([
        db.collection("appointments").countDocuments({ doctorId }),
        db
          .collection("appointments")
          .countDocuments({ doctorId, status: "pending" }),
        db
          .collection("appointments")
          .countDocuments({ doctorId, status: "cancelled" }),
        db
          .collection("appointments")
          .countDocuments({ doctorId, status: "completed" }),
        db
          .collection("appointments")
          .aggregate([
            { $match: { doctorId } },
            { $group: { _id: "$userId" } },
            { $count: "total" },
          ])
          .toArray(),
      ]);

    const totalPatients = uniquePatientsResult[0]?.total ?? 0;

    const nonCancelled = await db
      .collection("appointments")
      .countDocuments({ doctorId, status: { $ne: "cancelled" } });

    const revenue = Math.round(
      (nonCancelled * (doctor.consultationFee ?? 0)) / 1000,
    );

    res.json({
      total,
      pending,
      cancelled,
      completed,
      totalPatients,
      revenue,
      rating: doctor.rating ?? 0,
      consultationFee: doctor.consultationFee ?? 0,
    });
  } catch (error) {
    console.error("Error in GET /doctor-stats/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/doctor-chart/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const doctor = await db
      .collection("doctors")
      .findOne({ userId }, { projection: { _id: 1, consultationFee: 1 } });

    if (!doctor) {
      res.json({ appointments: [], revenue: [] });
      return;
    }

    const doctorId = doctor._id.toString();
    const feePerAppointment = doctor.consultationFee ?? 0;

    const raw = await db
      .collection("appointments")
      .aggregate([
        { $match: { doctorId, status: { $ne: "cancelled" } } },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: { dateString: "$date", format: "%Y-%m-%d" },
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$parsedDate" },
              month: { $month: "$parsedDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .toArray();

    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const appointments = raw.map((r) => ({
      month: MONTH_NAMES[r._id.month - 1],
      value: r.count,
    }));

    const revenue = raw.map((r) => ({
      month: MONTH_NAMES[r._id.month - 1],
      value: Math.round((r.count * feePerAppointment) / 1000),
    }));

    res.json({ appointments, revenue });
  } catch (error) {
    console.error("Error in GET /doctor-chart/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/doctor-weekly-chart/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const doctor = await db
      .collection("doctors")
      .findOne({ userId }, { projection: { _id: 1 } });

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (!doctor) {
      res.json(DAY_NAMES.map((day) => ({ day, appointments: 0 })));
      return;
    }

    const doctorId = doctor._id.toString();

    const raw = await db
      .collection("appointments")
      .aggregate([
        { $match: { doctorId, status: { $ne: "cancelled" } } },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: { dateString: "$date", format: "%Y-%m-%d" },
            },
          },
        },
        {
          $group: {
            _id: { dayOfWeek: { $dayOfWeek: "$parsedDate" } },
            appointments: { $sum: 1 },
          },
        },
        { $sort: { "_id.dayOfWeek": 1 } },
      ])
      .toArray();

    const weekMap: Record<string, number> = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
    };

    for (const r of raw) {
      const dayName = DAY_NAMES[r._id.dayOfWeek - 1];
      weekMap[dayName] = r.appointments;
    }

    const data = DAY_NAMES.map((day) => ({ day, appointments: weekMap[day] }));
    res.json(data);
  } catch (error) {
    console.error("Error in GET /doctor-weekly-chart/:userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const startServer = async (): Promise<void> => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB Atlas");

    db = client.db("medicon");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    await client.close();
    process.exit(1);
  }
};

startServer();
