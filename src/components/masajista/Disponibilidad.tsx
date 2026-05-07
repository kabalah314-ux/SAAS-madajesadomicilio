import { useState } from 'react';
import { Save, Clock, Plus, Trash2, Check } from 'lucide-react';
import { useApp } from '../../AppContext';

interface SlotDisponibilidad {
  dia: number; // 0-6 (domingo-sábado)
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export default function Disponibilidad() {
  const { currentUser } = useApp();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Estado inicial con disponibilidad por defecto
  const [slots, setSlots] = useState<SlotDisponibilidad[]>([
    // Ejemplo: Lunes a Viernes 9:00-14:00 y 16:00-20:00
    { dia: 1, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
    { dia: 1, hora_inicio: '16:00', hora_fin: '20:00', activo: true },
    { dia: 2, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
    { dia: 2, hora_inicio: '16:00', hora_fin: '20:00', activo: true },
    { dia: 3, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
    { dia: 3, hora_inicio: '16:00', hora_fin: '20:00', activo: true },
    { dia: 4, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
    { dia: 4, hora_inicio: '16:00', hora_fin: '20:00', activo: true },
    { dia: 5, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
    { dia: 5, hora_inicio: '16:00', hora_fin: '20:00', activo: true },
  ]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newSlot, setNewSlot] = useState({ hora_inicio: '09:00', hora_fin: '14:00' });

  const diasSemana = [
    { num: 0, nombre: 'Domingo', short: 'Dom' },
    { num: 1, nombre: 'Lunes', short: 'Lun' },
    { num: 2, nombre: 'Martes', short: 'Mar' },
    { num: 3, nombre: 'Miércoles', short: 'Mié' },
    { num: 4, nombre: 'Jueves', short: 'Jue' },
    { num: 5, nombre: 'Viernes', short: 'Vie' },
    { num: 6, nombre: 'Sábado', short: 'Sáb' },
  ];

  const horasDisponibles = Array.from({ length: 48 }, (_, i) => {
    const hora = Math.floor(i / 2);
    const minuto = i % 2 === 0 ? '00' : '30';
    return `${hora.toString().padStart(2, '0')}:${minuto}`;
  });

  const getSlotsPorDia = (dia: number) => {
    return slots.filter(s => s.dia === dia).sort((a, b) => 
      a.hora_inicio.localeCompare(b.hora_inicio)
    );
  };

  const agregarSlot = () => {
    if (selectedDay === null) return;
    
    setSlots([...slots, {
      dia: selectedDay,
      hora_inicio: newSlot.hora_inicio,
      hora_fin: newSlot.hora_fin,
      activo: true
    }]);
    setNewSlot({ hora_inicio: '09:00', hora_fin: '14:00' });
  };

  const eliminarSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const toggleSlot = (index: number) => {
    setSlots(slots.map((slot, i) => 
      i === index ? { ...slot, activo: !slot.activo } : slot
    ));
  };

  const copiarDia = (diaOrigen: number, diaDestino: number) => {
    const slotsDia = getSlotsPorDia(diaOrigen);
    const nuevosSlotsDestino = slotsDia.map(slot => ({
      ...slot,
      dia: diaDestino
    }));
    
    // Eliminar slots existentes del día destino y agregar los nuevos
    const slotsSinDestino = slots.filter(s => s.dia !== diaDestino);
    setSlots([...slotsSinDestino, ...nuevosSlotsDestino]);
  };

  const limpiarDia = (dia: number) => {
    if (confirm(`¿Eliminar toda la disponibilidad del ${diasSemana[dia].nombre}?`)) {
      setSlots(slots.filter(s => s.dia !== dia));
    }
  };

  const handleGuardar = () => {
    setSaving(true);
    
    // En producción guardaría en el backend
    console.log('Guardar disponibilidad:', slots);
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const totalHorasSemana = slots
    .filter(s => s.activo)
    .reduce((total, slot) => {
      const [hInicio, mInicio] = slot.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = slot.hora_fin.split(':').map(Number);
      const inicio = hInicio * 60 + mInicio;
      const fin = hFin * 60 + mFin;
      return total + (fin - inicio) / 60;
    }, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Disponibilidad</h2>
          <p className="text-gray-600 mt-1">Configura tus horarios disponibles por día de la semana</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-teal-600">{Math.round(totalHorasSemana)}h</div>
          <div className="text-sm text-gray-600">Total semana</div>
        </div>
      </div>

      {/* Alertas */}
      {saved && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div className="flex items-center gap-2">
            <Check size={20} className="text-green-600" />
            <p className="text-sm text-green-900">
              <strong>Disponibilidad guardada.</strong> Los cambios se reflejarán en el sistema de reservas.
            </p>
          </div>
        </div>
      )}

      {/* Vista Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {diasSemana.map(dia => {
          const slotsDia = getSlotsPorDia(dia.num);
          const horasTotales = slotsDia
            .filter(s => s.activo)
            .reduce((total, slot) => {
              const [hI, mI] = slot.hora_inicio.split(':').map(Number);
              const [hF, mF] = slot.hora_fin.split(':').map(Number);
              return total + ((hF * 60 + mF) - (hI * 60 + mI)) / 60;
            }, 0);

          const esSeleccionado = selectedDay === dia.num;

          return (
            <div 
              key={dia.num}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition ${
                esSeleccionado ? 'border-teal-500 ring-2 ring-teal-100' : 'border-gray-200'
              }`}
            >
              <div 
                className={`p-4 cursor-pointer ${
                  esSeleccionado ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white' : 'bg-gray-50'
                }`}
                onClick={() => setSelectedDay(dia.num)}
              >
                <div className="font-semibold text-center">{dia.short}</div>
                {horasTotales > 0 && (
                  <div className={`text-xs text-center mt-1 ${esSeleccionado ? 'text-teal-100' : 'text-gray-600'}`}>
                    {Math.round(horasTotales)}h
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2 min-h-[200px]">
                {slotsDia.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs py-8">
                    No disponible
                  </div>
                ) : (
                  slotsDia.map((slot, idx) => {
                    const globalIndex = slots.findIndex(s => 
                      s.dia === slot.dia && 
                      s.hora_inicio === slot.hora_inicio && 
                      s.hora_fin === slot.hora_fin
                    );

                    return (
                      <div 
                        key={idx}
                        className={`p-2 rounded-lg text-xs ${
                          slot.activo 
                            ? 'bg-teal-50 border border-teal-200 text-teal-900' 
                            : 'bg-gray-100 border border-gray-200 text-gray-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Clock size={12} />
                          <button
                            onClick={() => toggleSlot(globalIndex)}
                            className={`text-xs font-medium ${slot.activo ? 'text-teal-700' : 'text-gray-500'}`}
                          >
                            {slot.activo ? '✓' : '✗'}
                          </button>
                        </div>
                        <div className="font-mono font-medium">
                          {slot.hora_inicio} - {slot.hora_fin}
                        </div>
                        {esSeleccionado && (
                          <button
                            onClick={() => eliminarSlot(globalIndex)}
                            className="mt-1 text-red-600 hover:text-red-700 text-xs"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de edición */}
      {selectedDay !== null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Editar {diasSemana[selectedDay].nombre}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agregar nuevo slot */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Plus size={18} />
                Agregar Horario
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio
                  </label>
                  <select
                    value={newSlot.hora_inicio}
                    onChange={(e) => setNewSlot({ ...newSlot, hora_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  >
                    {horasDisponibles.map(hora => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Fin
                  </label>
                  <select
                    value={newSlot.hora_fin}
                    onChange={(e) => setNewSlot({ ...newSlot, hora_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  >
                    {horasDisponibles.map(hora => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={agregarSlot}
                  className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Agregar Franja
                </button>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Acciones Rápidas</h4>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          copiarDia(parseInt(e.target.value), selectedDay);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Copiar desde...</option>
                      {diasSemana
                        .filter(d => d.num !== selectedDay && getSlotsPorDia(d.num).length > 0)
                        .map(d => (
                          <option key={d.num} value={d.num}>{d.nombre}</option>
                        ))
                      }
                    </select>
                  </div>

                  <button
                    onClick={() => limpiarDia(selectedDay)}
                    className="w-full px-4 py-2 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Limpiar Todo el Día
                  </button>
                </div>
              </div>

              {/* Horarios comunes */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Plantillas Rápidas</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSlots([
                        ...slots.filter(s => s.dia !== selectedDay),
                        { dia: selectedDay, hora_inicio: '09:00', hora_fin: '14:00', activo: true },
                        { dia: selectedDay, hora_inicio: '16:00', hora_fin: '20:00', activo: true }
                      ]);
                    }}
                    className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm text-left"
                  >
                    <div className="font-medium">Horario Partido</div>
                    <div className="text-xs text-blue-600">9:00-14:00 y 16:00-20:00</div>
                  </button>

                  <button
                    onClick={() => {
                      setSlots([
                        ...slots.filter(s => s.dia !== selectedDay),
                        { dia: selectedDay, hora_inicio: '09:00', hora_fin: '21:00', activo: true }
                      ]);
                    }}
                    className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm text-left"
                  >
                    <div className="font-medium">Jornada Completa</div>
                    <div className="text-xs text-green-600">9:00-21:00</div>
                  </button>

                  <button
                    onClick={() => {
                      setSlots([
                        ...slots.filter(s => s.dia !== selectedDay),
                        { dia: selectedDay, hora_inicio: '16:00', hora_fin: '22:00', activo: true }
                      ]);
                    }}
                    className="w-full px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm text-left"
                  >
                    <div className="font-medium">Solo Tarde/Noche</div>
                    <div className="text-xs text-purple-600">16:00-22:00</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Clock size={18} />
          Información sobre la Disponibilidad
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
          <li>Configura los horarios en los que estás disponible para recibir asignaciones</li>
          <li>Puedes tener varios bloques horarios por día (ej: mañana y tarde)</li>
          <li>Los horarios inactivos (✗) no recibirán solicitudes pero se mantienen guardados</li>
          <li>Usa las plantillas rápidas para configurar días similares fácilmente</li>
          <li>Los cambios se aplican inmediatamente después de guardar</li>
        </ul>
      </div>

      {/* Botón guardar */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition font-semibold text-lg shadow-lg disabled:opacity-50 flex items-center gap-3"
        >
          {saving ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={24} />
              Guardar Disponibilidad
            </>
          )}
        </button>
      </div>
    </div>
  );
}
