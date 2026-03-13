"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { getVehicleByPlate, createVehicle } from "@/lib/firestore/vehicles";
import { createVisit, getActiveVisitByVehicle } from "@/lib/firestore/visits";
import { getServicesByBusiness } from "@/lib/firestore/services";
import { Service, Vehicle, VisitTaskItem } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import TopBar from "@/components/layout/TopBar";
import { normalizePhoneForWhatsapp, applyMessageTemplate } from "@/lib/utils";
import styles from "./entry.module.css";

const phonePrefixOptions = [
  { value: "+598", label: "Uruguay (+598)" },
  { value: "+54", label: "Argentina (+54)" },
  { value: "+55", label: "Brasil (+55)" },
];

function splitPhoneByPrefix(phone: string): { prefix: string; number: string } {
  const raw = (phone || "").trim();
  const normalized = raw.replace(/\s+/g, "");
  const matched = phonePrefixOptions.find((option) =>
    normalized.startsWith(option.value),
  );

  if (matched) {
    return {
      prefix: matched.value,
      number: normalized.slice(matched.value.length),
    };
  }

  return {
    prefix: "+598",
    number: normalized.replace(/^\+/, ""),
  };
}

export default function VehicleEntryPage() {
  const { currentBusiness } = useBusinessContext();
  const router = useRouter();
  const [step, setStep] = useState<"search" | "details" | "service">("search");
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<Partial<Vehicle>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const [showActiveRedirect, setShowActiveRedirect] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+598");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [visitTaskChecklist, setVisitTaskChecklist] = useState<VisitTaskItem[]>([]);
  const [newVisitTask, setNewVisitTask] = useState("");

  const buildVisitChecklistFromService = (service: Service | undefined): VisitTaskItem[] => {
    if (!service || service.type !== "open") return [];
    return (service.taskChecklist || [])
      .map((title, index) => {
        const normalized = title.trim();
        if (!normalized) return null;
        return {
          id: `svc-${Date.now()}-${index}`,
          title: normalized,
          completed: false,
        } as VisitTaskItem;
      })
      .filter((task): task is VisitTaskItem => task !== null);
  };

  useEffect(() => {
    if (currentBusiness) {
      getServicesByBusiness(currentBusiness.id).then((result) => {
        setServices(result);
        const defaultService = result.find((service) => service.isDefault);
        const defaultServiceId = defaultService?.id || result[0]?.id || "";
        setSelectedServiceId((prev) => prev || defaultServiceId);
        const initialService = result.find((service) => service.id === defaultServiceId);
        setVisitTaskChecklist(buildVisitChecklistFromService(initialService));
      });
    }
  }, [currentBusiness]);

  useEffect(() => {
    const selectedService = services.find((service) => service.id === selectedServiceId);
    setVisitTaskChecklist(buildVisitChecklistFromService(selectedService));
    setNewVisitTask("");
  }, [selectedServiceId, services]);

  const handleSearchPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setError("");
    setShowActiveRedirect(false);
    try {
      const existing = await getVehicleByPlate(plate);
      if (existing) {
        const activeVisit = await getActiveVisitByVehicle(
          currentBusiness.id,
          existing.id,
        );
        if (activeVisit) {
          setError(
            "Este vehículo ya tiene una visita activa. Debes registrar su salida antes de volver a ingresarlo.",
          );
          setShowActiveRedirect(true);
          return;
        }
        setVehicle(existing);
        const parsedPhone = splitPhoneByPrefix(existing.clientPhone || "");
        setPhonePrefix(parsedPhone.prefix);
        setPhoneNumber(parsedPhone.number);
      } else {
        setVehicle({ plate: plate.toUpperCase() });
        setPhonePrefix("+598");
        setPhoneNumber("");
      }
      setStep("details");
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (services.length === 0) {
      setError("No hay servicios configurados. Te redirigimos para crear uno.");
      router.push("/services");
      return;
    }
    setStep("service");
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !selectedServiceId) return;
    setLoading(true);
    setError("");
    setShowActiveRedirect(false);
    setWhatsAppUrl("");
    try {
      let vehicleId = (vehicle as Vehicle).id;
      if (!vehicleId) {
        const newVehicle = await createVehicle(
          vehicle.plate || plate,
          vehicle.brand || "",
          vehicle.model || "",
          vehicle.clientName || "",
          vehicle.clientPhone || "",
          vehicle.notes || "",
        );
        vehicleId = newVehicle.id;
      }

      const alreadyActive = await getActiveVisitByVehicle(
        currentBusiness.id,
        vehicleId,
      );
      if (alreadyActive) {
        setError(
          "Este vehículo ya se encuentra activo. No se puede registrar dos veces.",
        );
        setShowActiveRedirect(true);
        return;
      }

      const createdVisit = await createVisit(
        currentBusiness.id,
        vehicleId,
        selectedServiceId,
        notes,
        visitTaskChecklist,
      );

      const phone = normalizePhoneForWhatsapp(vehicle.clientPhone || "");
      if (phone) {
        const selectedService = services.find(
          (service) => service.id === selectedServiceId,
        );
        const entryDate = new Date().toLocaleString("es-AR");
        const pickupCode = createdVisit.id.slice(-6).toUpperCase();
        const defaultMessage = [
          `Hola ${vehicle.clientName || "cliente"}!`,
          `${currentBusiness.name} registró el ingreso de tu vehiculo ${vehicle.plate || plate}.`,
          `Fecha y hora de entrada: ${entryDate}.`,
          `Código de retiro: ${pickupCode}.`,
          "Presenta este mensaje al momento de retirar.",
        ].join("\n");
        const customTemplate = selectedService?.whatsappMessageTemplate || "";
        const hasCustomTemplate = customTemplate.trim().length > 0;
        const message = hasCustomTemplate
          ? applyMessageTemplate(customTemplate, {
              cliente: vehicle.clientName || "cliente",
              negocio: currentBusiness.name,
              placa: vehicle.plate || plate,
              marca: vehicle.brand || "-",
              servicio: selectedService?.name || "-",
              fechaEntrada: entryDate,
              codigoRetiro: pickupCode,
            })
          : defaultMessage;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        setWhatsAppUrl(url);
        window.open(url, "_blank", "noopener,noreferrer");
      }

      setSuccess("¡Visita registrada exitosamente!");
      setTimeout(() => router.push("/vehicles/active"), 1500);
    } catch {
      setError("Error al registrar la visita");
    } finally {
      setLoading(false);
    }
  };

  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name}${s.isDefault ? " (Sugerido)" : ""} - ${
      s.type === "open" ? "A definir" : `$${s.price}`
    } (${s.type === "hourly" ? "Por hora" : s.type === "open" ? "Variable" : "Precio fijo"})`,
  }));

  const selectedService = services.find((service) => service.id === selectedServiceId);

  const handleAddVisitTask = () => {
    const title = newVisitTask.trim();
    if (!title) return;

    setVisitTaskChecklist((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        title,
        completed: false,
      },
    ]);
    setNewVisitTask("");
  };

  const handleToggleVisitTask = (taskId: string) => {
    setVisitTaskChecklist((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const handleRemoveVisitTask = (taskId: string) => {
    setVisitTaskChecklist((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <>
      <TopBar title="Registrar Entrada" />
      <div className="main-content">
        <div className={styles.steps}>
          <div
            className={`${styles.step} ${step === "search" ? styles.active : styles.done}`}
          >
            1. Buscar placa
          </div>
          <div className={styles.stepDivider}>→</div>
          <div
            className={`${styles.step} ${step === "details" ? styles.active : step === "service" ? styles.done : ""}`}
          >
            2. Datos del vehículo
          </div>
          <div className={styles.stepDivider}>→</div>
          <div
            className={`${styles.step} ${step === "service" ? styles.active : ""}`}
          >
            3. Seleccionar servicio
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
            <div>{error}</div>
            {showActiveRedirect && (
              <div style={{ marginTop: "0.75rem" }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/vehicles/active")}
                >
                  Ir a vehículos activos
                </Button>
              </div>
            )}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
            {success}
          </div>
        )}
        {whatsAppUrl && (
          <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
            Mensaje de WhatsApp preparado. Si no se abrio automaticamente,{" "}
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">
              haz click aqui
            </a>
            .
          </div>
        )}

        {step === "search" && (
          <Card title="Buscar vehículo por placa">
            <form onSubmit={handleSearchPlate} className="form-group">
              <Input
                id="plate"
                label="Placa del vehículo"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123"
                required
              />
              <Button type="submit" loading={loading}>
                Buscar / Continuar
              </Button>
            </form>
          </Card>
        )}

        {step === "details" && (
          <Card title="Datos del cliente y vehículo">
            <form onSubmit={handleDetailsNext} className="form-group">
              <Input
                id="plate-display"
                label="Placa"
                value={vehicle.plate || plate}
                disabled
              />
              <p className={styles.requiredHint}>
                Campos obligatorios: <strong>Placa, Nombre del cliente y Teléfono</strong>.
              </p>
              <Input
                id="clientName"
                label="Nombre del cliente"
                type="text"
                value={vehicle.clientName || ""}
                onChange={(e) =>
                  setVehicle({ ...vehicle, clientName: e.target.value })
                }
                placeholder="Nombre del cliente"
                required
              />
              <div className={styles.phoneGroup}>
                <Select
                  id="phonePrefix"
                  label="Prefijo"
                  options={phonePrefixOptions}
                  value={phonePrefix}
                  onChange={(e) => {
                    const nextPrefix = e.target.value;
                    setPhonePrefix(nextPrefix);
                    setVehicle({
                      ...vehicle,
                      clientPhone: `${nextPrefix}${phoneNumber}`,
                    });
                  }}
                />
                <Input
                  id="clientPhone"
                  label="Teléfono del cliente"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const localPhone = e.target.value;
                    setPhoneNumber(localPhone);
                    setVehicle({
                      ...vehicle,
                      clientPhone: `${phonePrefix}${localPhone}`,
                    });
                  }}
                  placeholder="Número sin prefijo"
                  required
                />
              </div>

              <div className={styles.sectionDivider} />
              <p className={styles.optionalTitle}>Datos opcionales</p>
              <Input
                id="vehicleBrand"
                label="Marca del vehículo"
                type="text"
                value={vehicle.brand || ""}
                onChange={(e) =>
                  setVehicle({ ...vehicle, brand: e.target.value })
                }
                placeholder="Ej: Toyota"
              />
              <Input
                id="vehicleModel"
                label="Modelo del vehículo"
                type="text"
                value={vehicle.model || ""}
                onChange={(e) =>
                  setVehicle({ ...vehicle, model: e.target.value })
                }
                placeholder="Ej: Corolla"
              />
              <Input
                id="vehicleNotes"
                label="Notas del vehículo"
                type="text"
                value={vehicle.notes || ""}
                onChange={(e) =>
                  setVehicle({ ...vehicle, notes: e.target.value })
                }
                placeholder="Observaciones del vehículo"
              />
              <div style={{ display: "flex", gap: "1rem" }}>
                <Button variant="outline" onClick={() => setStep("search")}>
                  Atrás
                </Button>
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          </Card>
        )}

        {step === "service" && (
          <Card title="Seleccionar servicio">
            <form onSubmit={handleCreateVisit} className="form-group">
              {services.length === 0 ? (
                <div className="alert alert-error">
                  No hay servicios configurados. Primero debes crear uno en
                  Gestionar Servicios.
                </div>
              ) : (
                <Select
                  id="service"
                  label="Servicio"
                  options={serviceOptions}
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  required
                />
              )}
              {selectedService?.type === "open" && (
                <div className={styles.taskBox}>
                  <p className={styles.taskTitle}>Checklist del trabajo (tipo Variable)</p>
                  <p className={styles.taskHint}>
                    Partimos de las tareas por defecto del servicio, y puedes agregar o quitar items para esta visita.
                  </p>
                  <div className={styles.taskNewRow}>
                    <Input
                      id="new-visit-task"
                      label="Agregar tarea"
                      value={newVisitTask}
                      onChange={(e) => setNewVisitTask(e.target.value)}
                      placeholder="Ej: Revision de frenos"
                    />
                    <Button type="button" variant="outline" onClick={handleAddVisitTask}>
                      Agregar
                    </Button>
                  </div>
                  {visitTaskChecklist.length === 0 ? (
                    <p className={styles.taskEmpty}>No hay tareas para esta visita.</p>
                  ) : (
                    <ul className={styles.taskList}>
                      {visitTaskChecklist.map((task) => (
                        <li key={task.id} className={styles.taskItem}>
                          <label className={styles.taskCheck}>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleVisitTask(task.id)}
                            />
                            <span className={task.completed ? styles.taskDone : ""}>{task.title}</span>
                          </label>
                          <button
                            type="button"
                            className={styles.taskRemove}
                            onClick={() => handleRemoveVisitTask(task.id)}
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <Input
                id="visitNotes"
                label="Notas de la visita"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales"
              />
              <div style={{ display: "flex", gap: "1rem" }}>
                <Button variant="outline" onClick={() => setStep("details")}>
                  Atrás
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={services.length === 0}
                >
                  Registrar entrada
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
