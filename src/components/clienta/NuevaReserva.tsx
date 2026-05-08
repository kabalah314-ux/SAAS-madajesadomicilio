import { useState, useEffect } from 'react';
import { Check, ChevronRight, ChevronLeft, MapPin, Calendar, User, CreditCard, Sparkles } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Servicio, Masajista, Direccion } from '../../types';
import confetti from 'canvas-confetti';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function NuevaReserva() {
  const { currentUser, servicios, masajistas, createReserva } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Estado del formulario
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [direccion, setDireccion] = useState<Direccion>({
    calle: '',
    numero: '',
    piso: '',
    ciudad: 'Madrid',
    codigo_postal: '',
    barrio: '',
    instrucciones_acceso: ''
  });
  const [selectedMasajista, setSelectedMasajista] = useState<Masajista | null>(null);
  const [notas, setNotas] = useState('');
  const [reservaCreada, setReservaCreada] = useState<any>(null);

  const clienta = currentUser as any;

  // Cargar dirección habitual si existe
  useEffect(() => {
    if (step === 3 && clienta?.direccion_habitual) {
      setDireccion(clienta.direccion_habitual);
    }
  }, [step, clienta]);

  const usarDireccionHabitual = () => {
    if (clienta?.direccion_habitual) {
      setDireccion(clienta.direccion_habitual);
    }
  };

  const steps = [
    { num: 1, label: 'Servicio', icon: Sparkles },
    { num: 2, label: 'Fecha/Hora', icon: Calendar },
    { num: 3, label: 'Dirección', icon: MapPin },
    { num: 4, label: 'Masajista', icon: User },
    { num: 5, label: 'Checkout', icon: CreditCard },
    { num: 6, label: 'Confirmación', icon: Check }
  ];

  const canProceed = () => {
    switch (step) {
      case 1: return selectedServicio !== null;
      case 2: return fecha && horaInicio;
      case 3: return direccion.calle && direccion.numero && direccion.barrio && direccion.codigo_postal;
      case 4: return true; // Masajista es opcional (asignación automática)
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 6 && canProceed()) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const confirmarReserva = () => {
    if (!selectedServicio) return;

    setLoading(true);
    
    // Calcular hora fin
    const [hora, minuto] = horaInicio.split(':').map(Number);
    const horaFinNum = hora + Math.floor(selectedServicio.duracion_minutos / 60);
    const minutoFin = (minuto + (selectedServicio.duracion_minutos % 60)) % 60;
    const horaFin = `${horaFinNum.toString().padStart(2, '0')}:${minutoFin.toString().padStart(2, '0')}`;

    const nuevaReserva = createReserva({
      clienta_id: currentUser!.id,
      masajista_id: selectedMasajista?.id,
      servicio_id: selectedServicio.id,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      direccion,
      estado: selectedMasajista ? 'confirmada' : 'pendiente_asignacion',
      precio_total: selectedServicio.precio,
      pago_masajista: Math.round(selectedServicio.precio * 0.6),
      notas_clienta: notas
    });

    setTimeout(() => {
      setReservaCreada(nuevaReserva);
      setLoading(false);
      setStep(6);
      
      // Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1500);
  };

  // Obtener slots disponibles (simplificado - en producción consultaría disponibilidad real)
  const getSlotsDisponibles = () => {
    const slots = [];
    for (let hora = 9; hora <= 21; hora++) {
      slots.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 21) slots.push(`${hora.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const masajistasActivas = masajistas.filter(m => m.activo && m.documentacion_ok);
  const masajistaPreferida = clienta?.masajista_preferida;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Reserva</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Completa los pasos para reservar tu sesión</p>
      </div>

      {/* Indicador de progreso */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max sm:min-w-0">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;

            return (
              <div key={s.num} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white ring-4 ring-teal-100'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <Check size={16} className="sm:w-5 sm:h-5" /> : <Icon size={16} className="sm:w-5 sm:h-5" />}
                  </div>
                  <div className={`text-[10px] sm:text-xs mt-2 font-medium text-center px-1 ${
                    isActive ? 'text-teal-600' : 'text-gray-600'
                  }`}>
                    {s.label}
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    step > s.num ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {/* PASO 1: Selección de Servicio */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona el tipo de masaje</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicios.filter(s => s.activo).map(servicio => (
                <button
                  key={servicio.id}
                  onClick={() => setSelectedServicio(servicio)}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    selectedServicio?.id === servicio.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{servicio.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{servicio.nombre}</h4>
                      <p className="text-sm text-gray-600 mt-1">{servicio.descripcion}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-gray-600">⏱️ {servicio.duracion_minutos} min</span>
                        <span className="font-semibold text-teal-600">{servicio.precio}€</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Fecha y Hora */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">¿Cuándo te gustaría tu sesión?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de inicio
                </label>
                <select
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona una hora...</option>
                  {getSlotsDisponibles().map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedServicio && horaInicio && (
              <div className="bg-teal-50 rounded-lg p-4">
                <p className="text-sm text-teal-900">
                  <span className="font-medium">Duración del servicio:</span> {selectedServicio.duracion_minutos} minutos
                  <br />
                  <span className="font-medium">Hora estimada de finalización:</span>{' '}
                  {(() => {
                    const [h, m] = horaInicio.split(':').map(Number);
                    const finH = h + Math.floor(selectedServicio.duracion_minutos / 60);
                    const finM = (m + (selectedServicio.duracion_minutos % 60)) % 60;
                    return `${finH.toString().padStart(2, '0')}:${finM.toString().padStart(2, '0')}`;
                  })()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Dirección */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">¿Dónde quieres tu sesión?</h3>
              {clienta?.direccion_habitual && (
                <button
                  onClick={usarDireccionHabitual}
                  className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition"
                >
                  Usar mi dirección habitual
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calle *
                </label>
                <input
                  type="text"
                  value={direccion.calle}
                  onChange={(e) => setDireccion(prev => ({ ...prev, calle: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="Calle Alcalá"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número *
                </label>
                <input
                  type="text"
                  value={direccion.numero}
                  onChange={(e) => setDireccion(prev => ({ ...prev, numero: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Piso (opcional)
                </label>
                <input
                  type="text"
                  value={direccion.piso}
                  onChange={(e) => setDireccion(prev => ({ ...prev, piso: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="3º A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barrio *
                </label>
                <input
                  type="text"
                  value={direccion.barrio}
                  onChange={(e) => setDireccion(prev => ({ ...prev, barrio: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="Salamanca"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Postal *
                </label>
                <input
                  type="text"
                  value={direccion.codigo_postal}
                  onChange={(e) => setDireccion(prev => ({ ...prev, codigo_postal: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="28009"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instrucciones de acceso (opcional)
                </label>
                <input
                  type="text"
                  value={direccion.instrucciones_acceso}
                  onChange={(e) => setDireccion(prev => ({ ...prev, instrucciones_acceso: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="Portal verde, llamar al 3A"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: Selección de Masajista */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona tu masajista (opcional)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Puedes elegir una masajista específica o dejar que asignemos una disponible en tu zona.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedMasajista(null)}
                className={`p-4 rounded-xl border-2 transition text-left ${
                  selectedMasajista === null
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎲</div>
                  <h4 className="font-semibold text-gray-900">Asignación automática</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Buscaremos la mejor masajista disponible en tu zona
                  </p>
                </div>
              </button>

              {masajistasActivas.map(masajista => {
                const esPreferida = masajista.id === masajistaPreferida;
                
                return (
                  <button
                    key={masajista.id}
                    onClick={() => setSelectedMasajista(masajista)}
                    className={`p-4 rounded-xl border-2 transition text-left relative ${
                      selectedMasajista?.id === masajista.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {esPreferida && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex items-center gap-1">
                        ⭐ Tu preferida
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <img
                        src={masajista.foto || ''}
                        alt={masajista.nombre}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {masajista.nombre} {masajista.apellidos}
                        </h4>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-yellow-500">★</span>
                          <span className="text-sm font-medium text-gray-700">{masajista.rating_promedio}</span>
                          <span className="text-sm text-gray-500">({masajista.total_sesiones} sesiones)</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{masajista.bio}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {masajista.especialidades.slice(0, 3).map(esp => (
                            <span key={esp} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {esp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 5: Checkout */}
        {step === 5 && selectedServicio && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Resumen de tu reserva</h3>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <span className="text-4xl">{selectedServicio.emoji}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{selectedServicio.nombre}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedServicio.descripcion}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha y hora:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} • {horaInicio}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-medium text-gray-900">{selectedServicio.duracion_minutos} minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dirección:</span>
                  <span className="font-medium text-gray-900 text-right">
                    {direccion.calle} {direccion.numero}{direccion.piso && `, ${direccion.piso}`}
                    <br />
                    {direccion.barrio}, {direccion.codigo_postal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Masajista:</span>
                  <span className="font-medium text-gray-900">
                    {selectedMasajista ? `${selectedMasajista.nombre} ${selectedMasajista.apellidos}` : 'Asignación automática'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-300">
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio del servicio:</span>
                    <span className="font-medium text-gray-900">{selectedServicio.precio}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suplemento por zona:</span>
                    <span className="font-medium text-gray-900">0€</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-teal-600">{selectedServicio.precio}€</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                placeholder="Alergias, preferencias especiales, indicaciones..."
              />
            </div>

            <button
              onClick={confirmarReserva}
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition font-semibold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard size={24} />
                  Confirmar Reserva
                </>
              )}
            </button>
          </div>
        )}

        {/* PASO 6: Confirmación */}
        {step === 6 && reservaCreada && (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">¡Reserva Confirmada!</h3>
            <p className="text-gray-600 mb-6">
              {selectedMasajista 
                ? `Tu sesión ha sido confirmada con ${selectedMasajista.nombre}`
                : 'Estamos buscando la mejor masajista disponible en tu zona. Te notificaremos pronto.'}
            </p>

            <div className="bg-teal-50 rounded-xl p-6 mb-6 inline-block">
              <div className="text-sm text-teal-700 mb-1">Código de reserva</div>
              <div className="text-2xl font-bold text-teal-900 font-mono">{reservaCreada.codigo}</div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Nueva Reserva
              </button>
              <button
                onClick={() => {/* navegar a mis reservas */}}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium"
              >
                Ver Mis Reservas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones de navegación */}
      {step < 6 && (
        <div className="flex gap-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>
          )}
          {step < 5 && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
