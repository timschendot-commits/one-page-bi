# Verify a real registered notification icon for the isolated test process, then dispatch Explorer's double-click notification.
param([int]$AppProcess)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TrayProbe {
 [StructLayout(LayoutKind.Sequential)]struct IconId{public int size;public IntPtr hwnd;public uint id;public Guid guid;}
 [StructLayout(LayoutKind.Sequential)]struct Rect{public int left,top,right,bottom;}
 delegate bool Callback(IntPtr hwnd,IntPtr arg);
 [DllImport("user32.dll")]static extern bool EnumWindows(Callback cb,IntPtr arg);
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("shell32.dll")]static extern int Shell_NotifyIconGetRect(ref IconId id,out Rect rect);
 [DllImport("user32.dll")]static extern IntPtr SendMessage(IntPtr hwnd,int msg,IntPtr w,IntPtr l);
 public static bool Restore(int target){bool found=false;EnumWindows(delegate(IntPtr h,IntPtr arg){uint pid;GetWindowThreadProcessId(h,out pid);if(pid!=target)return true;
 for(uint i=1;i<=32;i++){var a=new IconId{hwnd=h,id=i,size=Marshal.SizeOf(typeof(IconId))};Rect r;if(Shell_NotifyIconGetRect(ref a,out r)==0){SendMessage(h,2048,(IntPtr)i,(IntPtr)0x0203);found=true;return false;}}
 return true;},IntPtr.Zero);return found;}
}
"@
if(![TrayProbe]::Restore($AppProcess)){throw 'No notification icon registered for the isolated process.'}
