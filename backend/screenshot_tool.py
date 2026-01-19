import tkinter as tk
from tkinter import messagebox
import pyautogui
import keyboard
import os
from pathlib import Path
import threading
import time

# --- Configuration ---
SAVE_FOLDER = Path(r"C:\Users\bhoge\OneDrive\Documents\Desktop\QPG\backend\data\data_structure\CET\11\Physics\1. Motion in Plane")
FILENAME_PREFIX = ""
HOTKEY = "F9"

# --- Setup ---
SAVE_FOLDER.mkdir(parents=True, exist_ok=True)

class ScreenshotApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Screenshot Tool")
        self.root.geometry("400x450")
        self.root.attributes("-topmost", True)  # Always on top

        # GUI Elements
        self.header_label = tk.Label(root, text="Enter Question Number", font=("Arial", 12, "bold"))
        self.header_label.pack(pady=(10, 5))

        self.q_number_var = tk.StringVar()
        self.q_number_var.trace("w", self.update_preview)
        self.entry = tk.Entry(root, textvariable=self.q_number_var, font=("Arial", 14), justify="center")
        self.entry.pack(pady=5)
        self.entry.bind("<Return>", lambda event: self.take_screenshot())
        self.entry.focus_set()

        self.preview_label = tk.Label(root, text="Preview: ...", fg="gray")
        self.preview_label.pack(pady=5)

        self.btn_capture = tk.Button(root, text=f"Take Screenshot ({HOTKEY})", command=self.take_screenshot, 
                                     bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), height=2)
        self.btn_capture.pack(pady=10, fill="x", padx=40)

        self.status_label = tk.Label(root, text="Ready", fg="blue", font=("Arial", 9))
        self.status_label.pack(pady=5)

        self.log_label = tk.Label(root, text="Session Log:", font=("Arial", 10, "bold"), anchor="w")
        self.log_label.pack(fill="x", padx=20, pady=(10, 0))

        self.log_list = tk.Listbox(root, height=8, font=("Courier", 9))
        self.log_list.pack(fill="both", padx=20, pady=5, expand=True)

        # Hotkey Listener in a separate thread to avoid blocking main loop
        keyboard.add_hotkey(HOTKEY, self.trigger_from_hotkey)

    def update_preview(self, *args):
        num = self.q_number_var.get()
        if num:
            self.preview_label.config(text=f"Save as: {FILENAME_PREFIX}{num}.png")
        else:
            self.preview_label.config(text="Preview: ...")

    def trigger_from_hotkey(self):
        # Determine if we can take a screenshot safely
        # Note: calling tkinter methods from another thread needs care, usually ok for simple configs
        # but capture logic should ideally be scheduled.
        self.root.after(0, self.take_screenshot)

    def take_screenshot(self):
        q_num = self.q_number_var.get().strip()
        
        if not q_num:
            messagebox.showwarning("Input Required", "Please enter a question number first.")
            self.entry.focus_set()
            return

        if not q_num.isdigit():
             messagebox.showerror("Invalid Input", "Please enter a valid numeric question number.")
             self.entry.focus_set()
             return

        filename = f"{FILENAME_PREFIX}{q_num}.png"
        filepath = SAVE_FOLDER / filename
        
        # Check for duplicates
        if filepath.exists():
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"{FILENAME_PREFIX}{q_num}_{timestamp}.png"
            filepath = SAVE_FOLDER / filename
            self.status_label.config(text=f"Duplicate found. Renamed to: {filename}", fg="orange")
        
        try:
            # Hide window briefly for clean screenshot? (Optional, user didn't request hiding window, but "always on top" might block view)
            # The prompt implies "screenshot capture tool", usually these hide themselves. 
            # But the user asked for "always on top", which suggests they might want to keep it visible or they want to see the input.
            # However, usually you don't want the tool in the screenshot. 
            # I will simply take the screenshot. If it blocks content, the user can move it.
            
            # Allow GUI to update before freezing for screenshot
            self.root.update_idletasks() 
            
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath)
            
            # Check if saved
            if filepath.exists():
                msg = f"Saved: {filename}"
                self.status_label.config(text=msg, fg="green")
                self.log_list.insert(0, f"#{q_num} -> {filename}") # Insert at top
                
                # Clear input and refocus
                self.q_number_var.set("")
                self.entry.focus_set()
                print(f"Screenshot saved to {filepath}")
            else:
                 self.status_label.config(text="Error: File not found after save.", fg="red")

        except Exception as e:
            self.status_label.config(text=f"Error: {str(e)}", fg="red")
            messagebox.showerror("Capture Error", str(e))

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = ScreenshotApp(root)
        root.mainloop()
    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        keyboard.unhook_all()
