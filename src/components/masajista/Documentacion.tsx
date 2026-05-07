import { FileText, Upload, Check, AlertTriangle, Clock, Eye } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Documento } from '../../types';

export default function Documentacion() {
  const { currentUser } = useApp();

  if (!currentUser || currentUser.role !== 'masajista') return null;

  const masajista = currentUser as any;
  const documentos = masajista.documentos || [];

  const getEstadoBadge = (estado: string) => {
    const badges = {
      'verificado': { label: '✅ Verificado', class: 'bg-green-100 text-green-700', icon: Check },
      'pendiente_revision': { label: '⏳ Pendiente revisión', class: 'bg-yellow-100 text-yellow-700', icon: Clock },
      'vencido': { label: '❌ Vencido', class: 'bg-red-100 text-red-700', icon: AlertTriangle },
      'no_subido': { label: '📤 No subido', class: 'bg-gray-100 text-gray-700', icon: Upload }
    };
    return badges[estado as keyof typeof badges] || badges.no_subido;
  };

  const getNombreDocumento = (tipo: string) => {
    const nombres = {
      'autonoma': 'Certificado de Autónoma',
      'seguro': 'Seguro de Responsabilidad Civil',
      'dni': 'DNI/NIE'
    };
    return nombres[tipo as keyof typeof nombres] || tipo;
  };

  const getIconoDocumento = (tipo: string) => {
    const iconos = {
      'autonoma': '📄',
      'seguro': '🛡️',
      'dni': '🪪'
    };
    return iconos[tipo as keyof typeof iconos] || '📄';
  };

  const handleFileUpload = (documentoId: string) => {
    // En un sistema real, esto abriría un file picker y subiría el archivo
    alert('Función de subida de archivos - En producción conectaría con el backend');
  };

  const docsPendientes = documentos.filter((d: Documento) => 
    d.estado === 'no_subido' || d.estado === 'vencido'
  ).length;

  const docsVerificados = documentos.filter((d: Documento) => d.estado === 'verificado').length;
  const todosVerificados = docsVerificados === documentos.length && documentos.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi Documentación</h2>
        <p className="text-gray-600 mt-1">Gestiona tus documentos oficiales</p>
      </div>

      {/* Alerta si hay documentos pendientes */}
      {docsPendientes > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-900">Tienes documentos pendientes</h3>
              <p className="text-orange-700 text-sm mt-1">
                Sin documentación completa no podrás recibir nuevas asignaciones. Por favor, sube los documentos faltantes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado general */}
      {todosVerificados && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Documentación completa ✅</h3>
              <p className="text-green-700 text-sm mt-1">
                Todos tus documentos están verificados. Estás habilitada para recibir asignaciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de documentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {documentos.map((doc: Documento) => {
          const estado = getEstadoBadge(doc.estado);
          const IconEstado = estado.icon;
          const estaSubido = doc.estado !== 'no_subido';
          const estaVencido = doc.estado === 'vencido';

          return (
            <div 
              key={doc.id} 
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                estaVencido ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className={`p-6 ${estaVencido ? 'bg-red-50' : ''}`}>
                <div className="text-4xl mb-3 text-center">
                  {getIconoDocumento(doc.tipo)}
                </div>
                
                <h3 className="font-semibold text-gray-900 text-center mb-2">
                  {getNombreDocumento(doc.tipo)}
                </h3>

                <div className="flex justify-center mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${estado.class}`}>
                    <IconEstado size={14} />
                    {estado.label}
                  </span>
                </div>

                {doc.fecha_vencimiento && (
                  <div className="text-center text-xs text-gray-600 mb-4">
                    Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-ES')}
                  </div>
                )}

                {estaSubido && doc.fecha_subida && (
                  <div className="text-center text-xs text-gray-500 mb-4">
                    Subido el {new Date(doc.fecha_subida).toLocaleDateString('es-ES')}
                  </div>
                )}

                <div className="space-y-2">
                  {!estaSubido ? (
                    <button
                      onClick={() => handleFileUpload(doc.id)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <Upload size={16} />
                      Subir documento
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => alert('Ver documento')}
                        className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        Ver documento
                      </button>
                      <button
                        onClick={() => handleFileUpload(doc.id)}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex items-center justify-center gap-2"
                      >
                        <Upload size={14} />
                        Actualizar
                      </button>
                    </>
                  )}
                </div>

                {doc.estado === 'verificado' && doc.fecha_verificacion && (
                  <div className="mt-3 text-center text-xs text-green-600">
                    Verificado el {new Date(doc.fecha_verificacion).toLocaleDateString('es-ES')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <FileText size={18} />
          Información sobre la documentación
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
          <li>Los documentos deben estar en formato PDF, JPG o PNG</li>
          <li>El tamaño máximo por archivo es de 5MB</li>
          <li>Todos los documentos serán revisados por el equipo administrativo</li>
          <li>Recibirás una notificación cuando tus documentos sean verificados</li>
          <li>Es tu responsabilidad mantener los documentos actualizados antes de su vencimiento</li>
        </ul>
      </div>
    </div>
  );
}
