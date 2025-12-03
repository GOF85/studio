' GUARDA COMO "imprimir-zebra.vbs" EN EL ESCRITORIO
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Conecta a Supabase (usando HTTP para realtime-like)
Set http = CreateObject("MSXML2.XMLHTTP")
http.open "GET", "https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/print_jobs?select=*&order=created_at.desc.limit=1", false
http.setRequestHeader "apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnFkcXBicnNldnV5Z2pyaHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjk5NDQsImV4cCI6MjA3OTc0NTk0NH0.HhaWDMd93Gd4KnoMDLQC2KdnAkkaRk4_alPqWbrAT-E"
http.setRequestHeader "Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnFkcXBicnNldnV5Z2pyaHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjk5NDQsImV4cCI6MjA3OTc0NTk0NH0.HhaWDMd93Gd4KnoMDLQC2KdnAkkaRk4_alPqWbrAT-E"
http.send

If http.Status = 200 Then
  Dim jobs
  jobs = http.responseText
  If InStr(jobs, "[]") = 0 Then  ' Si hay jobs
    Dim job
    job = Replace(jobs, "[", ""): job = Replace(job, "]", ""): job = Replace(job, "}", "")
    Dim nombre, isotermo_id
    nombre = Mid(job, InStr(job, "nombre") + 8)
    nombre = Left(nombre, InStr(nombre, ",") - 1)
    isotermo_id = Mid(job, InStr(job, "isotermo_id") + 12)
    isotermo_id = Left(isotermo_id, InStr(isotermo_id, ",") - 1)

    ' Genera ZPL
    Dim zpl
    zpl = "^XA" & vbCrLf & _
          "^CF0,40" & vbCrLf & _
          "^FO50,30^FD" & nombre & "^FS" & vbCrLf & _
          "^FO50,90^FDCONTENIDO EJEMPLO^FS" & vbCrLf & _
          "^FO50,140^FD" & Date & "^FS" & vbCrLf & _
          "^FO50,190^BQN,2,6^FDQA," & isotermo_id & "^FS" & vbCrLf & _
          "^XZ"

    ' Guarda ZPL en archivo temporal
    Dim tempFile
    tempFile = "C:\temp\etiqueta.zpl"
    Set file = objFSO.CreateTextFile(tempFile, true)
    file.Write zpl
    file.Close

    ' Imprime con Windows (usa la impresora Zebra)
    WshShell.Run "notepad /p " & tempFile, 0, true

    ' Borra el job (HTTP DELETE)
    http.open "DELETE", "https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/print_jobs?eq.id=" & isotermo_id, false
    http.setRequestHeader "apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnFkcXBicnNldnV5Z2pyaHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjk5NDQsImV4cCI6MjA3OTc0NTk0NH0.HhaWDMd93Gd4KnoMDLQC2KdnAkkaRk4_alPqWbrAT-E"
    http.setRequestHeader "Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnFkcXBicnNldnV5Z2pyaHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjk5NDQsImV4cCI6MjA3OTc0NTk0NH0.HhaWDMd93Gd4KnoMDLQC2KdnAkkaRk4_alPqWbrAT-E"
    http.send

    WScript.Echo "Etiqueta impresa para " & nombre
  End If
End If

' Loop para chequear cada 5 segundos
Do
  WScript.Sleep 5000
  ' Repite el check
Loop