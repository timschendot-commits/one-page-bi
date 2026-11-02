# Drive only the Win32 dialog owned by the isolated test process.
param([int]$AppProcess,[string]$FilePath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class TestDialog {
  delegate bool Visitor(IntPtr h,IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(Visitor v,IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent,Visitor v,IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr h,int msg,IntPtr a,StringBuilder value);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr h,int msg,IntPtr a,string value);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h,int msg,IntPtr w,IntPtr l);
  [DllImport("user32.dll")] static extern IntPtr GetDlgItem(IntPtr h,int id);
  public static bool Fill(IntPtr dlg,string target){
    IntPtr field=IntPtr.Zero;
    EnumChildWindows(dlg,delegate(IntPtr h,IntPtr unused){
      var cls=new StringBuilder(100);GetClassName(h,cls,100);
      if(cls.ToString()!="Edit" || !IsWindowVisible(h))return true;
      var value=new StringBuilder(2048);SendMessage(h,13,(IntPtr)value.Capacity,value);
      if(!value.ToString().EndsWith(".png",StringComparison.OrdinalIgnoreCase))return true;
      field=h;return false;
    },IntPtr.Zero);
    if(field==IntPtr.Zero)return false;
    SendMessage(field,12,IntPtr.Zero,target);
    var actual=new StringBuilder(4096);SendMessage(field,13,(IntPtr)actual.Capacity,actual);
    IntPtr ok=GetDlgItem(dlg,1);
    return ok!=IntPtr.Zero && actual.ToString()==target && PostMessage(ok,245,IntPtr.Zero,IntPtr.Zero);
  }
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h,StringBuilder c,int n);
  public static IntPtr OwnedBy(int process) {
    IntPtr result=IntPtr.Zero;
    EnumWindows(delegate(IntPtr h,IntPtr unused){
      uint pid;GetWindowThreadProcessId(h,out pid);
      if(pid!=process)return true;
      var c=new StringBuilder(80);GetClassName(h,c,80);
      if(c.ToString()!="#32770" || !IsWindowVisible(h))return true;
      result=h;return false;
    },IntPtr.Zero);
    return result;
  }
}
'@
$limit=[DateTime]::UtcNow.AddSeconds(15)
do {
  $hwnd=[TestDialog]::OwnedBy($AppProcess)
  if($hwnd -ne [IntPtr]::Zero){
    if([TestDialog]::Fill($hwnd,$FilePath)){exit 0}
    $dialog=[Windows.Automation.AutomationElement]::FromHandle($hwnd)
    $editCondition=New-Object Windows.Automation.PropertyCondition ([Windows.Automation.AutomationElement]::ControlTypeProperty),([Windows.Automation.ControlType]::Edit)
    $edits=$dialog.FindAll([Windows.Automation.TreeScope]::Descendants,$editCondition)
    foreach($edit in $edits){
      if($edit.Current.AutomationId -notin @('1001','1148')){continue}
      $pattern=$edit.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)
      $pattern.SetValue($FilePath)
      $okCondition=New-Object Windows.Automation.PropertyCondition ([Windows.Automation.AutomationElement]::AutomationIdProperty),'1'
      $ok=$dialog.FindFirst([Windows.Automation.TreeScope]::Descendants,$okCondition)
      if($null -ne $ok){$ok.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke();exit 0}
    }
  }
  Start-Sleep -Milliseconds 100
}while([DateTime]::UtcNow -lt $limit)
throw "Owned dialog $hwnd did not expose filename and OK controls. Edit IDs: $(@($edits | ForEach-Object {$_.Current.AutomationId}) -join ',')"

