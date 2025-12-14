"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  subscribeToMedications,
  subscribeToTodayDoses,
  markDoseAsTaken,
  addMedication,
  updateMedication,
  deleteMedication,
  getTodayDateString,
  isDateInRange,
} from "@/lib/medications";
import type { Medication, MedicationDose } from "@/types/medication";
import "@/styles/dashboard.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayDoses, setTodayDoses] = useState<MedicationDose[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [deletingMedication, setDeletingMedication] = useState<Medication | null>(null);


  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequencyPerDay: 1,
    times: [""],
    startDate: "",
    endDate: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push("/auth/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const today = getTodayDateString();
    
    const unsubscribeMedications = subscribeToMedications(
      user.uid,
      (meds) => {
        setMedications(meds);
      }
    );

    const unsubscribeDoses = subscribeToTodayDoses(
      user.uid,
      today,
      (doses) => {
        setTodayDoses(doses);
      }
    );

    return () => {
      unsubscribeMedications();
      unsubscribeDoses();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };


  const activeMedications = medications.filter((m) => m.isActive);
  const today = getTodayDateString();
  
  const todayScheduledDoses = activeMedications
    .filter((m) => isDateInRange(today, m.startDate, m.endDate))
    .reduce((sum, m) => sum + m.times.length, 0);

  const todayTakenDoses = todayDoses.filter((d) => d.takenAt).length;
  const remainingDoses = todayScheduledDoses - todayTakenDoses;


  const getUpcomingDoses = () => {
    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const upcoming: Array<{
      medication: Medication;
      time: string;
      scheduledDateTime: Date;
      isTaken: boolean;
    }> = [];

    activeMedications
      .filter((m) => isDateInRange(today, m.startDate, m.endDate))
      .forEach((med) => {
        med.times.forEach((timeStr) => {
          const [hours, minutes] = timeStr.split(":").map(Number);
          const scheduledDateTime = new Date();
          scheduledDateTime.setHours(hours, minutes, 0, 0);

          if (
            scheduledDateTime >= now &&
            scheduledDateTime <= threeHoursLater
          ) {
            const doseKey = `${med.id}-${today}-${timeStr}`;
            const isTaken = todayDoses.some(
              (d) =>
                d.medicationId === med.id &&
                d.scheduledTime === timeStr &&
                d.date === today &&
                d.takenAt
            );

            upcoming.push({
              medication: med,
              time: timeStr,
              scheduledDateTime,
              isTaken,
            });
          }
        });
      });

    return upcoming.sort(
      (a, b) => a.scheduledDateTime.getTime() - b.scheduledDateTime.getTime()
    );
  };

  const handleMarkAsTaken = async (
    medicationId: string,
    scheduledTime: string
  ) => {
    if (!user) return;
    try {
      await markDoseAsTaken(user.uid, medicationId, scheduledTime, today);
    } catch (error) {
      console.error("Error marking dose as taken:", error);
      alert("Doza işaretlenirken bir hata oluştu.");
    }
  };

  const openAddModal = () => {
    setEditingMedication(null);
    setFormData({
      name: "",
      dosage: "",
      frequencyPerDay: 1,
      times: [""],
      startDate: getTodayDateString(),
      endDate: "",
      notes: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMedication(med);
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequencyPerDay: med.frequencyPerDay,
      times: med.times.length > 0 ? med.times : [""],
      startDate: med.startDate,
      endDate: med.endDate || "",
      notes: med.notes || "",
      isActive: med.isActive,
    });
    setShowModal(true);
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const handleFrequencyChange = (value: number) => {
    const newFrequency = value || 1;
    const currentTimes = formData.times.filter((t) => t.trim() !== "");
    
  
    let newTimes: string[];
    if (newFrequency > currentTimes.length) {
    
      newTimes = [
        ...currentTimes,
        ...Array(newFrequency - currentTimes.length).fill(""),
      ];
    } else if (newFrequency < currentTimes.length) {
    
      newTimes = currentTimes.slice(0, newFrequency);
    } else {
    
      newTimes = currentTimes.length > 0 
        ? currentTimes 
        : Array(newFrequency).fill("");
    }
    
    setFormData({
      ...formData,
      frequencyPerDay: newFrequency,
      times: newTimes,
    });
  };

  const addTimeField = () => {
    setFormData({
      ...formData,
      times: [...formData.times, ""],
    });
  };

  const removeTimeField = (index: number) => {
    const newTimes = formData.times.filter((_, i) => i !== index);
    setFormData({ ...formData, times: newTimes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim() || !formData.dosage.trim()) {
      alert("Lütfen ilaç adı ve doz bilgisini girin.");
      return;
    }

    const validTimes = formData.times.filter((t) => t.trim() !== "");
    if (validTimes.length === 0) {
      alert("En az bir saat girmelisiniz.");
      return;
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    const invalidTimes = validTimes.filter((t) => !timeRegex.test(t));
    if (invalidTimes.length > 0) {
      alert("Saat formatı geçersiz. Lütfen HH:mm formatında girin (örn: 08:00).");
      return;
    }

    try {
      const medicationData: any = {
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        frequencyPerDay: validTimes.length,
        times: validTimes,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
      };

     
      const trimmedNotes = formData.notes.trim();
      if (trimmedNotes) {
        medicationData.notes = trimmedNotes;
      }

      if (editingMedication) {
        await updateMedication(editingMedication.id, medicationData);
      } else {
        await addMedication(user.uid, medicationData);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving medication:", error);
      alert("İlaç kaydedilirken bir hata oluştu.");
    }
  };

  const handleDelete = async () => {
    if (!deletingMedication) return;
    try {
      await deleteMedication(deletingMedication.id);
      setDeletingMedication(null);
    } catch (error) {
      console.error("Error deleting medication:", error);
      alert("İlaç silinirken bir hata oluştu.");
    }
  };

  const toggleActive = async (med: Medication) => {
    try {
      await updateMedication(med.id, { isActive: !med.isActive });
    } catch (error) {
      console.error("Error updating medication:", error);
      alert("İlaç durumu güncellenirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  const upcomingDoses = getUpcomingDoses();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>İlaç Hatırlatıcı</h1>
          <p>Günlük ilaçlarını buradan takip edebilirsin.</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Çıkış Yap
        </button>
      </header>

      {/* Summary Widgets */}
      <div className="widgets-grid">
        <div className="widget-card">
          <div className="widget-icon">💊</div>
          <div className="widget-content">
            <div className="widget-label">Toplam İlaç Sayısı</div>
            <div className="widget-value">{activeMedications.length}</div>
          </div>
        </div>
        <div className="widget-card">
          <div className="widget-icon">📅</div>
          <div className="widget-content">
            <div className="widget-label">Bugün Alınması Gereken Doz</div>
            <div className="widget-value">{todayScheduledDoses}</div>
          </div>
        </div>
        <div className="widget-card">
          <div className="widget-icon">✅</div>
          <div className="widget-content">
            <div className="widget-label">Bugün Alınan Doz</div>
            <div className="widget-value">{todayTakenDoses}</div>
          </div>
        </div>
        <div className="widget-card">
          <div className="widget-icon">⏰</div>
          <div className="widget-content">
            <div className="widget-label">Kalan Doz</div>
            <div className="widget-value">{remainingDoses}</div>
          </div>
        </div>
      </div>

      {/* Yaklaşan İlaçlarım */}
      <section className="dashboard-section">
        <h2>Yaklaşan İlaçlarım</h2>
        {upcomingDoses.length === 0 ? (
          <div className="empty-state">
            Önümüzdeki 3 saat içinde alınması gereken ilaç yok.
          </div>
        ) : (
          <div className="upcoming-doses-list">
            {upcomingDoses.map((item, idx) => {
              const doseKey = `${item.medication.id}-${today}-${item.time}-${idx}`;
              return (
                <div key={doseKey} className="upcoming-dose-card">
                  <div className="dose-info">
                    <div className="dose-name">{item.medication.name}</div>
                    <div className="dose-details">
                      {item.medication.dosage} • {item.time}
                    </div>
                  </div>
                  <div className="dose-status">
                    {item.isTaken ? (
                      <span className="status-badge taken">Alındı</span>
                    ) : (
                      <>
                        <span className="status-badge pending">Bekliyor</span>
                        <button
                          onClick={() =>
                            handleMarkAsTaken(
                              item.medication.id,
                              item.time
                            )
                          }
                          className="mark-taken-button"
                        >
                          Alındı olarak işaretle
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* İlaçlarım Table */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>İlaçlarım</h2>
          <button onClick={openAddModal} className="add-button">
            Yeni İlaç Ekle
          </button>
        </div>

        {medications.length === 0 ? (
          <div className="empty-state">
            Henüz ilaç eklenmemiş. İlk ilacınızı eklemek için "Yeni İlaç Ekle"
            butonuna tıklayın.
          </div>
        ) : (
          <div className="table-container">
            <table className="medications-table">
              <thead>
                <tr>
                  <th>İlaç Adı</th>
                  <th>Doz</th>
                  <th>Günlük Kaç Kez</th>
                  <th>Saatler</th>
                  <th>Başlangıç Tarihi</th>
                  <th>Bitiş Tarihi</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id}>
                    <td>{med.name}</td>
                    <td>{med.dosage}</td>
                    <td>{med.frequencyPerDay}</td>
                    <td>
                      <div className="time-chips">
                        {med.times.map((time, idx) => (
                          <span key={idx} className="time-chip">
                            {time}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{med.startDate}</td>
                    <td>{med.endDate || "—"}</td>
                    <td>
                      <button
                        onClick={() => toggleActive(med)}
                        className={`status-toggle ${med.isActive ? "active" : "inactive"}`}
                      >
                        {med.isActive ? "Aktif" : "Pasif"}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => openEditModal(med)}
                          className="edit-button"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => setDeletingMedication(med)}
                          className="delete-button"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingMedication ? "İlaç Düzenle" : "Yeni İlaç Ekle"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>İlaç Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Doz *</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) =>
                    setFormData({ ...formData, dosage: e.target.value })
                  }
                  placeholder="örn: 500 mg, 1 tablet"
                  required
                />
              </div>

              <div className="form-group">
                <label>Günlük Kaç Kez *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.frequencyPerDay}
                  onChange={(e) =>
                    handleFrequencyChange(parseInt(e.target.value) || 1)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Saatler *</label>
                {formData.times.map((time, index) => (
                  <div key={index} className="time-input-row">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      required
                    />
                    {formData.times.length > formData.frequencyPerDay && (
                      <button
                        type="button"
                        onClick={() => removeTimeField(index)}
                        className="remove-time-button"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
                {formData.times.length < formData.frequencyPerDay && (
                  <button
                    type="button"
                    onClick={addTimeField}
                    className="add-time-button"
                  >
                    + Saat Ekle
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Başlangıç Tarihi *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Bitiş Tarihi</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="cancel-button"
                >
                  İptal
                </button>
                <button type="submit" className="save-button">
                  {editingMedication ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMedication && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingMedication(null)}
        >
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>İlacı Sil</h2>
            <p>
              Bu ilacı silmek istediğine emin misin? Bu işlem geri alınamaz.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setDeletingMedication(null)}
                className="cancel-button"
              >
                İptal
              </button>
              <button onClick={handleDelete} className="delete-confirm-button">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

